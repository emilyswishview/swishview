CREATE OR REPLACE FUNCTION public.country_dial_code(_iso text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(coalesce(_iso,''))
    WHEN 'US' THEN '1' WHEN 'CA' THEN '1' WHEN 'GB' THEN '44' WHEN 'IE' THEN '353'
    WHEN 'AU' THEN '61' WHEN 'NZ' THEN '64' WHEN 'IN' THEN '91' WHEN 'PK' THEN '92'
    WHEN 'BD' THEN '880' WHEN 'LK' THEN '94' WHEN 'AE' THEN '971' WHEN 'SA' THEN '966'
    WHEN 'QA' THEN '974' WHEN 'KW' THEN '965' WHEN 'OM' THEN '968' WHEN 'BH' THEN '973'
    WHEN 'ZA' THEN '27' WHEN 'NG' THEN '234' WHEN 'KE' THEN '254' WHEN 'GH' THEN '233'
    WHEN 'EG' THEN '20' WHEN 'MA' THEN '212' WHEN 'DE' THEN '49' WHEN 'FR' THEN '33'
    WHEN 'ES' THEN '34' WHEN 'IT' THEN '39' WHEN 'NL' THEN '31' WHEN 'BE' THEN '32'
    WHEN 'CH' THEN '41' WHEN 'AT' THEN '43' WHEN 'SE' THEN '46' WHEN 'NO' THEN '47'
    WHEN 'DK' THEN '45' WHEN 'FI' THEN '358' WHEN 'PL' THEN '48' WHEN 'PT' THEN '351'
    WHEN 'GR' THEN '30' WHEN 'TR' THEN '90' WHEN 'RU' THEN '7' WHEN 'UA' THEN '380'
    WHEN 'BR' THEN '55' WHEN 'MX' THEN '52' WHEN 'AR' THEN '54' WHEN 'CL' THEN '56'
    WHEN 'CO' THEN '57' WHEN 'PE' THEN '51' WHEN 'PH' THEN '63' WHEN 'ID' THEN '62'
    WHEN 'MY' THEN '60' WHEN 'SG' THEN '65' WHEN 'TH' THEN '66' WHEN 'VN' THEN '84'
    WHEN 'JP' THEN '81' WHEN 'KR' THEN '82' WHEN 'CN' THEN '86' WHEN 'HK' THEN '852'
    WHEN 'TW' THEN '886' WHEN 'IL' THEN '972'
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.repair_calling_lead_phones()
RETURNS TABLE(fixed integer, removed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_fixed integer := 0; v_removed integer := 0;
BEGIN
  -- 1) numbers stored as "+0<national>" → prepend the country dial code
  WITH bad AS (
    SELECT cl.id,
           regexp_replace(cl.phone, '\D', '', 'g') AS digits,
           public.country_dial_code(COALESCE(NULLIF(cl.country,''), yc.country)) AS dial
      FROM public.calling_leads cl
      LEFT JOIN public.youtube_channels yc ON yc.channel_id = cl.channel_id
     WHERE cl.source = 'lead-engine'
       AND cl.phone !~ '^\+[1-9][0-9]{7,14}$'
  ), upd AS (
    UPDATE public.calling_leads cl
       SET phone = '+' || bad.dial || regexp_replace(bad.digits, '^0+', ''),
           updated_at = now()
      FROM bad
     WHERE cl.id = bad.id
       AND bad.dial IS NOT NULL
       AND length(bad.dial || regexp_replace(bad.digits, '^0+', '')) BETWEEN 8 AND 15
    RETURNING 1
  )
  SELECT count(*) INTO v_fixed FROM upd;

  -- keep lead_contacts in sync with the repaired numbers
  UPDATE public.lead_contacts lc
     SET normalized_value = cl.phone
    FROM public.calling_leads cl
   WHERE lc.channel_id = cl.channel_id
     AND lc.contact_type = 'phone'
     AND lc.normalized_value !~ '^\+[1-9][0-9]{7,14}$'
     AND cl.phone ~ '^\+[1-9][0-9]{7,14}$';

  -- 2) anything still undialable is junk — drop it from the calling list
  WITH del AS (
    DELETE FROM public.calling_leads
     WHERE source = 'lead-engine'
       AND phone !~ '^\+[1-9][0-9]{7,14}$'
    RETURNING 1
  )
  SELECT count(*) INTO v_removed FROM del;

  fixed := v_fixed; removed := v_removed;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.repair_calling_lead_phones() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_calling_lead_phones() TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_calling_leads(_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; n integer := 0; v_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (lc.channel_id)
           lc.channel_id,
           lc.normalized_value AS phone,
           yc.title, yc.url, yc.thumbnail, yc.subscriber_count, yc.total_views, yc.country
      FROM public.lead_contacts lc
      JOIN public.youtube_channels yc ON yc.channel_id = lc.channel_id
     WHERE lc.contact_type = 'phone'
       AND lc.normalized_value ~ '^\+[1-9][0-9]{7,14}$'
       AND NOT EXISTS (
         SELECT 1 FROM public.calling_leads cl
          WHERE cl.channel_id = lc.channel_id
             OR lower(cl.channel_link) = lower(coalesce(yc.url, ''))
       )
     ORDER BY lc.channel_id, lc.confidence DESC NULLS LAST, lc.created_at
     LIMIT GREATEST(1, COALESCE(_limit, 500))
  LOOP
    v_id := public.upsert_calling_lead_from_channel(
      r.channel_id,
      COALESCE(r.title, ''),
      COALESCE(NULLIF(r.url, ''), 'https://www.youtube.com/channel/' || r.channel_id),
      COALESCE(r.thumbnail, ''),
      r.phone,
      COALESCE(r.subscriber_count, 0),
      COALESCE(r.total_views, 0),
      COALESCE(r.country, ''),
      ''
    );
    IF v_id IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.reconcile_calling_leads(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_calling_leads(integer) TO service_role;
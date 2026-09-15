-- 1) Atomic handoff into calling_leads (matches the lower(channel_link) unique index)
CREATE OR REPLACE FUNCTION public.upsert_calling_lead_from_channel(
  _channel_id text,
  _channel_name text,
  _channel_link text,
  _thumbnail text,
  _phone text,
  _subscribers bigint,
  _total_views bigint,
  _country text,
  _keyword text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF _phone IS NULL OR btrim(_phone) = '' OR _channel_link IS NULL OR btrim(_channel_link) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _id FROM public.calling_leads
   WHERE (_channel_id IS NOT NULL AND _channel_id <> '' AND channel_id = _channel_id)
      OR lower(channel_link) = lower(_channel_link)
   ORDER BY created_at
   LIMIT 1;

  IF _id IS NOT NULL THEN
    UPDATE public.calling_leads SET
      channel_id   = COALESCE(NULLIF(_channel_id, ''), channel_id),
      channel_name = COALESCE(NULLIF(_channel_name, ''), channel_name),
      thumbnail    = COALESCE(NULLIF(_thumbnail, ''), thumbnail),
      phone        = _phone,
      subscribers  = GREATEST(COALESCE(subscribers, 0), COALESCE(_subscribers, 0)),
      total_views  = GREATEST(COALESCE(total_views, 0), COALESCE(_total_views, 0)),
      country      = COALESCE(NULLIF(_country, ''), country),
      keyword      = COALESCE(NULLIF(_keyword, ''), keyword),
      updated_at   = now()
    WHERE id = _id;
    RETURN _id;
  END IF;

  INSERT INTO public.calling_leads
    (channel_id, channel_name, channel_link, thumbnail, phone, subscribers, total_views, country, keyword, source, call_status)
  VALUES
    (NULLIF(_channel_id, ''), COALESCE(NULLIF(_channel_name, ''), 'Unknown channel'), _channel_link,
     NULLIF(_thumbnail, ''), _phone, COALESCE(_subscribers, 0), COALESCE(_total_views, 0),
     NULLIF(_country, ''), NULLIF(_keyword, ''), 'lead-engine', 'new')
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_calling_lead_from_channel(text,text,text,text,text,bigint,bigint,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_calling_lead_from_channel(text,text,text,text,text,bigint,bigint,text,text) TO service_role;

-- 2) Recovery: requeue expired discovery jobs AND fail stale search attempts
CREATE OR REPLACE FUNCTION public.recover_expired_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  WITH x AS (
    UPDATE public.discovery_jobs
       SET status = CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'queued' END,
           worker_id = NULL, locked_at = NULL, lock_expires_at = NULL,
           next_run_at = now(),
           last_error = COALESCE(last_error, 'worker lease expired')
     WHERE status IN ('claimed','running') AND lock_expires_at < now()
     RETURNING 1)
  SELECT count(*) INTO n FROM x;

  UPDATE public.search_jobs
     SET status = 'failed',
         completed_at = now(),
         last_error = COALESCE(last_error, 'worker lease expired before completion')
   WHERE status = 'running'
     AND started_at < now() - interval '10 minutes';

  RETURN n;
END;
$$;

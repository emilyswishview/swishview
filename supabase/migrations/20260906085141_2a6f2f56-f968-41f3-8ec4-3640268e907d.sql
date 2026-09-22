CREATE OR REPLACE FUNCTION public.roll_api_quota_day()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  n integer;
BEGIN
  UPDATE public.youtube_api_projects
     SET search_calls_used = 0,
         read_units_used = 0,
         quota_day = today,
         health_status = CASE WHEN enabled THEN 'healthy' ELSE 'disabled' END,
         cooldown_until = NULL,
         error_count = 0
   WHERE quota_day IS DISTINCT FROM today;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.roll_api_quota_day() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roll_api_quota_day() TO service_role;

-- reserve_api_quota: also roll over when quota_day is ahead of today (clock/timezone drift)
CREATE OR REPLACE FUNCTION public.reserve_api_quota(_search_calls integer, _read_units integer)
RETURNS TABLE (project_id uuid, secret_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
BEGIN
  PERFORM public.roll_api_quota_day();

  SELECT * INTO rec
    FROM public.youtube_api_projects
   WHERE enabled
     AND (cooldown_until IS NULL OR cooldown_until <= now())
     AND search_calls_used + _search_calls <= search_calls_limit
     AND read_units_used + _read_units <= read_units_limit
   ORDER BY (search_calls_limit - search_calls_used) DESC,
            (read_units_limit - read_units_used) DESC,
            priority DESC, last_used_at NULLS FIRST
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF rec IS NULL THEN RETURN; END IF;

  UPDATE public.youtube_api_projects
     SET search_calls_used = search_calls_used + _search_calls,
         read_units_used   = read_units_used + _read_units,
         last_used_at = now()
   WHERE id = rec.id;

  project_id := rec.id; secret_name := rec.api_key_secret_name;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.reserve_api_quota(integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_api_quota(integer,integer) TO service_role;

-- unstick the pool immediately
SELECT public.roll_api_quota_day();
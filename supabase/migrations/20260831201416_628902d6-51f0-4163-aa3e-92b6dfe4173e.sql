CREATE OR REPLACE FUNCTION public.reserve_api_quota(_search_calls integer, _read_units integer)
RETURNS TABLE (project_id uuid, secret_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  rec record;
BEGIN
  UPDATE public.youtube_api_projects
     SET search_calls_used = 0, read_units_used = 0, quota_day = today,
         health_status = CASE WHEN enabled THEN 'healthy' ELSE 'disabled' END,
         cooldown_until = NULL, error_count = 0
   WHERE quota_day < today;

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

CREATE OR REPLACE FUNCTION public.release_api_quota(_project uuid, _search_calls integer, _read_units integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.youtube_api_projects
     SET search_calls_used = GREATEST(0, search_calls_used - _search_calls),
         read_units_used   = GREATEST(0, read_units_used - _read_units)
   WHERE id = _project;
$$;

CREATE OR REPLACE FUNCTION public.mark_api_project(_project uuid, _status text, _cooldown_seconds integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.youtube_api_projects
     SET health_status = _status,
         error_count = CASE WHEN _status = 'healthy' THEN 0 ELSE error_count + 1 END,
         search_calls_used = CASE WHEN _status = 'exhausted' THEN search_calls_limit ELSE search_calls_used END,
         read_units_used   = CASE WHEN _status = 'exhausted' THEN read_units_limit ELSE read_units_used END,
         cooldown_until = CASE WHEN _cooldown_seconds > 0
                               THEN now() + make_interval(secs => _cooldown_seconds) ELSE NULL END
   WHERE id = _project;
$$;

CREATE OR REPLACE FUNCTION public.recover_expired_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH x AS (
    UPDATE public.discovery_jobs
       SET status = CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'queued' END,
           worker_id = NULL, locked_at = NULL, lock_expires_at = NULL
     WHERE status IN ('claimed','running') AND lock_expires_at < now()
     RETURNING 1)
  SELECT count(*) INTO n FROM x;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.claim_jobs(_worker text, _job_type text, _limit integer, _lease_seconds integer)
RETURNS SETOF public.discovery_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.discovery_jobs d
     SET status = 'running', worker_id = _worker, locked_at = now(),
         lock_expires_at = now() + make_interval(secs => _lease_seconds),
         attempts = d.attempts + 1
   WHERE d.id IN (
     SELECT id FROM public.discovery_jobs
      WHERE status IN ('queued','retry') AND job_type = _job_type AND next_run_at <= now()
      ORDER BY priority DESC, next_run_at
      FOR UPDATE SKIP LOCKED
      LIMIT _limit)
   RETURNING d.*;
END $$;

CREATE OR REPLACE FUNCTION public.acquire_engine_lock(_name text, _worker text, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.engine_locks (name, worker_id, expires_at)
  VALUES (_name, _worker, now() + make_interval(secs => _seconds))
  ON CONFLICT (name) DO UPDATE
     SET worker_id = EXCLUDED.worker_id, expires_at = EXCLUDED.expires_at
   WHERE public.engine_locks.expires_at < now()
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.release_engine_lock(_name text, _worker text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.engine_locks SET expires_at = now() - interval '1 second'
   WHERE name = _name AND worker_id = _worker;
$$;

REVOKE ALL ON FUNCTION public.reserve_api_quota(integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_api_quota(uuid,integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_api_project(uuid,text,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_jobs(text,text,integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_expired_jobs() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.acquire_engine_lock(text,text,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_engine_lock(text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_api_quota(integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_api_quota(uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_api_project(uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_jobs(text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_expired_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_engine_lock(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_engine_lock(text,text) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('lead-engine-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lead-engine-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/lead-engine-worker',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 5000
  );
  $cron$
);
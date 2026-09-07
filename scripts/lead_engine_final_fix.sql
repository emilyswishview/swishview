-- =====================================================================
-- Lead engine — FINAL reliability patch. Run once in the Supabase SQL editor
-- of project nuxixhoogohqligzgbdm. Safe to re-run (idempotent).
--
-- What it does:
--   1. installs the helper functions the worker calls (roll_api_quota_day,
--      engine_sweep, engine_events log table)
--   2. unfreezes the API pool right now (daily rollover + stale cooldowns)
--   3. targets US + CA only and switches autopilot back on
--   4. re-schedules the cron with auth headers and a 120s timeout, plus a
--      5-minute sweep so a crashed tick can never stall the queue
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------- 1. helpers

-- Pacific-midnight daily rollover, callable on its own (previously this only
-- happened inside reserve_api_quota, so a used-up pool looked exhausted forever).
DROP FUNCTION IF EXISTS public.roll_api_quota_day() CASCADE;
CREATE FUNCTION public.roll_api_quota_day()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.youtube_api_projects
     SET search_calls_used = 0, read_units_used = 0,
         quota_day = (now() AT TIME ZONE 'America/Los_Angeles')::date,
         health_status = CASE WHEN enabled THEN 'healthy' ELSE 'disabled' END,
         cooldown_until = NULL, error_count = 0
   WHERE quota_day < (now() AT TIME ZONE 'America/Los_Angeles')::date;

  UPDATE public.youtube_api_projects
     SET health_status = 'healthy', cooldown_until = NULL, error_count = 0
   WHERE health_status IN ('cooling','error')
     AND cooldown_until IS NOT NULL AND cooldown_until <= now();
$$;

-- Live activity log shown in the /phone engine panel.
CREATE TABLE IF NOT EXISTS public.engine_events (
  id         bigserial PRIMARY KEY,
  worker_id  text,
  level      text NOT NULL DEFAULT 'info',
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Older installs may have these tables without the timestamp columns.
ALTER TABLE public.engine_events   ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.engine_events   ADD COLUMN IF NOT EXISTS worker_id  text;
ALTER TABLE public.engine_events   ADD COLUMN IF NOT EXISTS level      text NOT NULL DEFAULT 'info';
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS worker_id text;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 4;
ALTER TABLE public.discovery_jobs  ADD COLUMN IF NOT EXISTS next_run_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS engine_events_recent_idx ON public.engine_events (created_at DESC);
GRANT SELECT ON public.engine_events TO authenticated;
GRANT ALL ON public.engine_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.engine_events_id_seq TO service_role;
ALTER TABLE public.engine_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY engine_events_read ON public.engine_events FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backstop sweep: never let a crashed invocation stall the queue.
DROP FUNCTION IF EXISTS public.engine_sweep() CASCADE;
CREATE FUNCTION public.engine_sweep()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.roll_api_quota_day();

  UPDATE public.engine_locks SET expires_at = now() - interval '1 second'
   WHERE name = 'lead-engine-worker' AND expires_at < now() - interval '5 minutes';

  UPDATE public.discovery_jobs
     SET status = 'queued', worker_id = NULL, locked_at = NULL,
         lock_expires_at = NULL, next_run_at = now()
   WHERE status IN ('claimed','running') AND lock_expires_at < now();

  UPDATE public.discovery_jobs
     SET status = 'queued', next_run_at = now(), attempts = 0
   WHERE status IN ('retry','failed') AND attempts < max_attempts AND next_run_at <= now();

  DELETE FROM public.discovery_jobs
   WHERE status IN ('completed','failed','dead_letter')
     AND created_at < now() - interval '10 minutes';

  DELETE FROM public.engine_events WHERE created_at < now() - interval '3 days';
$$;

REVOKE ALL ON FUNCTION public.roll_api_quota_day() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.engine_sweep() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roll_api_quota_day() TO service_role;
GRANT EXECUTE ON FUNCTION public.engine_sweep() TO service_role;

-- ---------------------------------------------------------------- 2. unfreeze now
SELECT public.engine_sweep();

-- Projects that have no API key configured must not hold a slot in the pool.
UPDATE public.youtube_api_projects
   SET enabled = false, health_status = 'disabled'
 WHERE api_key_secret_name = 'YOUTUBE_API_KEY_7';

-- ---------------------------------------------------------------- 3. US + CA autopilot
UPDATE public.engine_settings
   SET autopilot = true,
       paused_reason = NULL,
       config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
         'markets', jsonb_build_array(
            jsonb_build_object('region','US','language','en'),
            jsonb_build_object('region','CA','language','en')),
         'maxSearchJobsPerTick', 3,
         'maxContactJobsPerTick', 16),
       updated_at = now()
 WHERE id = 1;

-- Segments outside US/CA should never be picked again.
UPDATE public.search_segments SET status = 'blocked'
 WHERE region_code NOT IN ('US','CA') AND status IN ('new','active','productive');

-- Give the US/CA frontier a clean start.
UPDATE public.search_segments
   SET status = 'new', page_token = NULL, priority = 60, last_error = NULL
 WHERE region_code IN ('US','CA') AND status IN ('exhausted','low_yield','error');

-- ---------------------------------------------------------------- 4. cron
DO $$ BEGIN PERFORM cron.unschedule('lead-engine-tick'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('lead-engine-sweep'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'lead-engine-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/lead-engine-worker',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

SELECT cron.schedule('lead-engine-sweep', '*/5 * * * *', $cron$ SELECT public.engine_sweep(); $cron$);

-- ---------------------------------------------------------------- 5. verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'lead-engine%';
SELECT name, enabled, health_status, search_calls_used, read_units_used, quota_day
  FROM public.youtube_api_projects ORDER BY name;
SELECT status, count(*) FROM public.discovery_jobs GROUP BY status;

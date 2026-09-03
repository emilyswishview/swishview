-- =====================================================================
-- Lead engine — cron reliability patch (run once in the Supabase SQL editor)
--   • authenticates the cron call (the worker rejects unauthenticated posts)
--   • longer pg_net timeout so a long tick is not abandoned
--   • frees stuck jobs / stale API cooldowns every 5 minutes as a backstop
-- Replace <SERVICE_ROLE_KEY> with the project's service_role key before running.
-- =====================================================================

DO $$ BEGIN PERFORM cron.unschedule('lead-engine-tick'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('lead-engine-sweep'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'lead-engine-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/lead-engine-worker',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>","apikey":"<SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

-- Backstop sweep: never let a crashed invocation stall the queue.
CREATE OR REPLACE FUNCTION public.engine_sweep()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.engine_locks SET expires_at = now() - interval '1 second'
   WHERE name = 'lead-engine-worker' AND expires_at < now() - interval '5 minutes';

  UPDATE public.discovery_jobs
     SET status = 'queued', worker_id = NULL, locked_at = NULL, lock_expires_at = NULL
   WHERE status IN ('claimed','running') AND lock_expires_at < now();

  UPDATE public.discovery_jobs
     SET status = 'queued', next_run_at = now(), attempts = 0
   WHERE status IN ('retry','failed') AND attempts < max_attempts AND next_run_at <= now();

  DELETE FROM public.discovery_jobs
   WHERE job_type = 'search' AND status IN ('completed','failed','dead_letter')
     AND created_at < now() - interval '10 minutes';

  UPDATE public.youtube_api_projects
     SET health_status = 'healthy', cooldown_until = NULL, error_count = 0
   WHERE health_status IN ('cooling','error')
     AND (cooldown_until IS NULL OR cooldown_until <= now());
$$;

REVOKE ALL ON FUNCTION public.engine_sweep() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.engine_sweep() TO service_role;

SELECT cron.schedule('lead-engine-sweep', '*/5 * * * *', $cron$ SELECT public.engine_sweep(); $cron$);

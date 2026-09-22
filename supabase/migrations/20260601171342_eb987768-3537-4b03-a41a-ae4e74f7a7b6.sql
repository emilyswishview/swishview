-- Enable cron + http extensions for scheduled background sync
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any previous schedule with the same name (safe re-run)
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'prospects-daily-sync';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Schedule daily at 03:30 UTC = 09:00 IST. Calls the prospects-daily-sync edge function,
-- which iterates all prospects in the background and refreshes YouTube data once per day.
SELECT cron.schedule(
  'prospects-daily-sync',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/prospects-daily-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ"}'::jsonb,
    body := '{"scheduled":true}'::jsonb
  );
  $$
);

-- Server-side queue for prospect outreach emails. The Prospects UI inserts
-- one row per email with a pre-computed scheduled_at (staggered randomly).
-- A pg_cron job calls process-prospect-email-queue every minute, which
-- picks up due rows and sends via Gmail. Bulk campaigns keep running even
-- when the browser is closed.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.prospect_email_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid,
  prospect_id     uuid,
  to_email        text NOT NULL,
  cc              text[],
  bcc             text[],
  subject         text NOT NULL,
  body_text       text NOT NULL,
  from_email      text NOT NULL,
  from_name       text,
  reply_to        text,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'pending',
  attempts        int  NOT NULL DEFAULT 0,
  last_error      text,
  message_id      text,
  sent_at         timestamptz,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospect_email_jobs_due_idx
  ON public.prospect_email_jobs (scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS prospect_email_jobs_batch_idx
  ON public.prospect_email_jobs (batch_id);
CREATE INDEX IF NOT EXISTS prospect_email_jobs_prospect_idx
  ON public.prospect_email_jobs (prospect_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_email_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_email_jobs TO authenticated;
GRANT ALL ON public.prospect_email_jobs TO service_role;

ALTER TABLE public.prospect_email_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospect_email_jobs"
  ON public.prospect_email_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prospect_email_jobs"
  ON public.prospect_email_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prospect_email_jobs"
  ON public.prospect_email_jobs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prospect_email_jobs"
  ON public.prospect_email_jobs FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.prospect_email_jobs_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$fn$;

DROP TRIGGER IF EXISTS prospect_email_jobs_updated_at ON public.prospect_email_jobs;
CREATE TRIGGER prospect_email_jobs_updated_at
  BEFORE UPDATE ON public.prospect_email_jobs
  FOR EACH ROW EXECUTE FUNCTION public.prospect_email_jobs_set_updated_at();

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'process-prospect-email-queue';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'process-prospect-email-queue',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/process-prospect-email-queue',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eGl4aG9vZ29ocWxpZ3pnYmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDI4NTgsImV4cCI6MjA2NDA3ODg1OH0.SWNqG4qtcgs3zmMOh-89RSTA7nAXdcNbWpFjDYCUCSQ"}'::jsonb,
    body := '{"scheduled":true}'::jsonb
  );
  $cron$
);

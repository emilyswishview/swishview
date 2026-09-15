
CREATE TABLE IF NOT EXISTS public.prospect_email_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  prospect_id UUID,
  to_email TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospect_email_jobs_status_sched_idx
  ON public.prospect_email_jobs (status, scheduled_at);
CREATE INDEX IF NOT EXISTS prospect_email_jobs_batch_idx
  ON public.prospect_email_jobs (batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_email_jobs TO authenticated;
GRANT ALL ON public.prospect_email_jobs TO service_role;

ALTER TABLE public.prospect_email_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage prospect email jobs" ON public.prospect_email_jobs;
CREATE POLICY "auth manage prospect email jobs"
  ON public.prospect_email_jobs FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS prospect_email_jobs_touch ON public.prospect_email_jobs;
CREATE TRIGGER prospect_email_jobs_touch
  BEFORE UPDATE ON public.prospect_email_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

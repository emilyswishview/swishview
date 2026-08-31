ALTER TABLE public.calling_leads DROP CONSTRAINT IF EXISTS calling_leads_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS calling_leads_channel_link_uniq ON public.calling_leads (lower(channel_link));
CREATE INDEX IF NOT EXISTS calling_leads_source_idx ON public.calling_leads (source);
CREATE INDEX IF NOT EXISTS calling_leads_status_idx ON public.calling_leads (call_status);
CREATE INDEX IF NOT EXISTS calling_leads_subs_idx ON public.calling_leads (subscribers DESC);
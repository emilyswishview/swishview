-- Calling ↔ Prospects field parity.
-- Adds the email/last-video/description/language context to calling_leads and
-- backfills it from the prospects table and the youtube_channels discovery table.
-- Idempotent: safe to run more than once.

ALTER TABLE public.calling_leads
  ADD COLUMN IF NOT EXISTS email            text,
  ADD COLUMN IF NOT EXISTS last_video_title text,
  ADD COLUMN IF NOT EXISTS last_video_date  timestamptz,
  ADD COLUMN IF NOT EXISTS last_video_url   text,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS language         text;

CREATE INDEX IF NOT EXISTS calling_leads_email_idx ON public.calling_leads (email);
CREATE INDEX IF NOT EXISTS calling_leads_last_video_date_idx ON public.calling_leads (last_video_date DESC NULLS LAST);

-- Backfill from prospects (matched on channel link, case-insensitive).
UPDATE public.calling_leads c
SET
  email            = COALESCE(c.email, NULLIF(p.data->>'email', '')),
  last_video_title = COALESCE(c.last_video_title, NULLIF(p.data->>'lastVideoTitle', '')),
  last_video_url   = COALESCE(c.last_video_url, NULLIF(p.data->>'lastVideoUrl', '')),
  description      = COALESCE(c.description, NULLIF(p.data->>'description', ''), NULLIF(p.data->>'channelDescription', '')),
  last_video_date  = COALESCE(
                       c.last_video_date,
                       NULLIF(p.data->>'lastVideoDate', '')::timestamptz
                     )
FROM public.prospects p
WHERE lower(COALESCE(p.data->>'channelLink', p.channel_link, '')) = lower(c.channel_link)
  AND c.channel_link <> '';

-- Backfill anything still missing from the discovery engine tables.
UPDATE public.calling_leads c
SET
  description = COALESCE(c.description, y.description),
  language    = COALESCE(c.language, y.language)
FROM public.youtube_channels y
WHERE y.channel_id = c.channel_id
  AND c.channel_id IS NOT NULL;

-- Read-only call outcome for the email/prospects side.
CREATE OR REPLACE VIEW public.prospects_call_status AS
SELECT
  lower(c.channel_link) AS channel_link,
  c.channel_id,
  c.call_status,
  c.last_called_at,
  c.assigned_to AS caller
FROM public.calling_leads c;

GRANT SELECT ON public.prospects_call_status TO authenticated;
GRANT ALL ON public.prospects_call_status TO service_role;

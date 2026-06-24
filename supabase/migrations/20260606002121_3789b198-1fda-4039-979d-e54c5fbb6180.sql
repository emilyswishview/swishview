CREATE TABLE IF NOT EXISTS public.prospects_conv_cache (
  id text PRIMARY KEY,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  replied jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_total integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects_conv_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects_conv_cache TO anon;
GRANT ALL ON public.prospects_conv_cache TO service_role;

ALTER TABLE public.prospects_conv_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospects_conv_cache"
  ON public.prospects_conv_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert prospects_conv_cache"
  ON public.prospects_conv_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update prospects_conv_cache"
  ON public.prospects_conv_cache FOR UPDATE
  USING (true);
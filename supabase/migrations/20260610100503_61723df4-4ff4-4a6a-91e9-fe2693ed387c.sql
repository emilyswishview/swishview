
CREATE TABLE IF NOT EXISTS public.prospect_sender_config (
  sender_email text PRIMARY KEY,
  warmup_start_date date NOT NULL DEFAULT current_date,
  ramp_days integer NOT NULL DEFAULT 14,
  starting_cap integer NOT NULL DEFAULT 20,
  target_daily_cap integer NOT NULL DEFAULT 100,
  paused boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_sender_config TO authenticated;
GRANT ALL ON public.prospect_sender_config TO service_role;

ALTER TABLE public.prospect_sender_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read sender config"
  ON public.prospect_sender_config FOR SELECT TO authenticated
  USING (public.is_swishview_staff(auth.uid()));

CREATE POLICY "staff write sender config"
  ON public.prospect_sender_config FOR ALL TO authenticated
  USING (public.is_swishview_staff(auth.uid()))
  WITH CHECK (public.is_swishview_staff(auth.uid()));

CREATE TRIGGER prospect_sender_config_touch
BEFORE UPDATE ON public.prospect_sender_config
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed defaults for known senders so the dashboard isn't empty
INSERT INTO public.prospect_sender_config (sender_email)
SELECT unnest(ARRAY[
  'amelia@swishview.com','ashley@swishview.com','daisy@swishview.com',
  'emily.j@swishview.com','emily@swishview.com','grace@swishview.com',
  'hazel@swishview.com','irene@swishview.com','mia.brooks@swishview.com',
  'rachel@swishview.com','scarlett.l@swishview.com','scarlett@swishview.com',
  'serena@swishview.com','sophie@swishview.com',
  'amelia@swishview.email','grace@swishview.email','jasmine@swishview.email',
  'rachel@swishview.email','serena@swishview.email','sophie@swishview.email'
])
ON CONFLICT (sender_email) DO NOTHING;

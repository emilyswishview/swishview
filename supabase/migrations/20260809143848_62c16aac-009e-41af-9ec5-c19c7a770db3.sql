CREATE TABLE public.calling_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id text,
  channel_name text NOT NULL DEFAULT '',
  channel_link text NOT NULL DEFAULT '',
  thumbnail text,
  phone text NOT NULL,
  subscribers bigint DEFAULT 0,
  total_views bigint DEFAULT 0,
  country text,
  keyword text,
  source text NOT NULL DEFAULT 'phone-tool',
  call_status text NOT NULL DEFAULT 'new',
  call_notes text,
  last_called_at timestamp with time zone,
  assigned_to text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calling_leads TO authenticated;
GRANT ALL ON public.calling_leads TO service_role;

ALTER TABLE public.calling_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calling_leads_select" ON public.calling_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "calling_leads_insert" ON public.calling_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "calling_leads_update" ON public.calling_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "calling_leads_delete" ON public.calling_leads FOR DELETE TO authenticated USING (
  lower(COALESCE((auth.jwt() ->> 'email'), '')) = 'emilyadmin@swishview.com' OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE UNIQUE INDEX calling_leads_channel_id_key ON public.calling_leads (channel_id) WHERE channel_id IS NOT NULL AND channel_id <> '';
CREATE UNIQUE INDEX calling_leads_phone_key ON public.calling_leads (phone);
CREATE INDEX calling_leads_created_at_idx ON public.calling_leads (created_at DESC);

CREATE TRIGGER calling_leads_touch_updated_at BEFORE UPDATE ON public.calling_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
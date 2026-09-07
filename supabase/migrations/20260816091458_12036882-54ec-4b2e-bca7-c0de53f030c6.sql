ALTER TABLE public.seo_plans ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.seo_plans SET is_active = false;

INSERT INTO public.seo_plans (name, duration_months, price, description, features, is_active)
VALUES (
  'Annual Plan',
  12,
  2999,
  'Full-year YouTube SEO & organic growth program — one plan, everything included.',
  ARRAY[
    'Complete channel & video SEO audit',
    'Niche keyword mapping and title/description/tag optimization',
    'Thumbnail & CTR strategy reviews',
    'Month-by-month growth roadmap',
    'Dedicated senior SEO lead',
    'Weekly growth reporting',
    '100% real, organic growth — no bots'
  ],
  true
);

CREATE TABLE public.callback_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  phone_e164 text,
  phone_region text,
  channel_url text,
  availability text,
  timezone text,
  requirements text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.callback_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.callback_requests TO authenticated;
GRANT ALL ON public.callback_requests TO service_role;

ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a callback"
ON public.callback_requests FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff can view callback requests"
ON public.callback_requests FOR SELECT TO authenticated
USING (public.is_swishview_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update callback requests"
ON public.callback_requests FOR UPDATE TO authenticated
USING (public.is_swishview_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can delete callback requests"
ON public.callback_requests FOR DELETE TO authenticated
USING (public.is_swishview_staff(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_callback_requests_updated_at
BEFORE UPDATE ON public.callback_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
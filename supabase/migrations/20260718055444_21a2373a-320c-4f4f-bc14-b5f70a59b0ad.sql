
CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  channel_url text NOT NULL,
  channel_id text,
  channel_name text NOT NULL,
  channel_handle text,
  channel_thumbnail text,
  subscribers bigint DEFAULT 0,
  total_views bigint DEFAULT 0,
  video_count int DEFAULT 0,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.roadmaps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmaps TO authenticated;
GRANT ALL ON public.roadmaps TO service_role;

ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roadmaps are publicly viewable" ON public.roadmaps FOR SELECT USING (true);
CREATE POLICY "Admins can insert roadmaps" ON public.roadmaps FOR INSERT TO authenticated
  WITH CHECK (public.is_swishview_staff(auth.uid()));
CREATE POLICY "Admins can update roadmaps" ON public.roadmaps FOR UPDATE TO authenticated
  USING (public.is_swishview_staff(auth.uid()));
CREATE POLICY "Admins can delete roadmaps" ON public.roadmaps FOR DELETE TO authenticated
  USING (public.is_swishview_staff(auth.uid()));

CREATE TRIGGER update_roadmaps_updated_at BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

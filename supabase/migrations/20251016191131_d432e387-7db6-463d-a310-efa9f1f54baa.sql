-- Create YouTube analytics cache table for instant loading
CREATE TABLE IF NOT EXISTS public.youtube_analytics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_title text,
  channel_subscribers integer DEFAULT 0,
  channel_videos integer DEFAULT 0,
  channel_views bigint DEFAULT 0,
  analytics_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_start_date date,
  last_fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_youtube_analytics_cache_user_id ON public.youtube_analytics_cache(user_id);

-- Enable RLS
ALTER TABLE public.youtube_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own cached analytics
CREATE POLICY "Users can view their own cached analytics"
ON public.youtube_analytics_cache
FOR SELECT
USING (user_id = auth.uid());

-- Edge functions can manage cache
CREATE POLICY "Edge functions can manage cache"
ON public.youtube_analytics_cache
FOR ALL
USING (true);

-- Admins can view all cached analytics
CREATE POLICY "Admins can view all cached analytics"
ON public.youtube_analytics_cache
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Update trigger
CREATE TRIGGER update_youtube_analytics_cache_updated_at
BEFORE UPDATE ON public.youtube_analytics_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
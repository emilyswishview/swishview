-- Create table for SEO analytics data that admin can manage for users
CREATE TABLE public.seo_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- YouTube Channel Metrics
  channel_url text,
  subscribers_current integer DEFAULT 0,
  subscribers_last_week integer DEFAULT 0,
  views_current bigint DEFAULT 0,
  views_last_week bigint DEFAULT 0,
  watch_time_hours integer DEFAULT 0,
  
  -- SEO Metrics
  search_impressions integer DEFAULT 0,
  search_clicks integer DEFAULT 0,
  click_through_rate decimal(5,2) DEFAULT 0,
  average_position decimal(5,2) DEFAULT 0,
  organic_traffic integer DEFAULT 0,
  
  -- Additional Metrics
  keywords_ranking integer DEFAULT 0,
  backlinks_count integer DEFAULT 0,
  domain_authority integer DEFAULT 0,
  
  -- Meta
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  
  -- Access Control
  seo_access_enabled boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.seo_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own SEO analytics" 
ON public.seo_analytics 
FOR SELECT 
USING (user_id = auth.uid() AND seo_access_enabled = true);

CREATE POLICY "Admins can manage all SEO analytics" 
ON public.seo_analytics 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create table for historical SEO analytics data for graphs
CREATE TABLE public.seo_analytics_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Snapshot data
  subscribers_count integer DEFAULT 0,
  views_count bigint DEFAULT 0,
  search_impressions integer DEFAULT 0,
  search_clicks integer DEFAULT 0,
  organic_traffic integer DEFAULT 0,
  
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.seo_analytics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SEO history" 
ON public.seo_analytics_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM seo_analytics 
  WHERE seo_analytics.user_id = seo_analytics_history.user_id 
  AND seo_analytics.user_id = auth.uid() 
  AND seo_analytics.seo_access_enabled = true
));

CREATE POLICY "Admins can manage all SEO history" 
ON public.seo_analytics_history 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Auto-update timestamp function
CREATE TRIGGER update_seo_analytics_updated_at
BEFORE UPDATE ON public.seo_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_seo_analytics_user_id ON public.seo_analytics(user_id);
CREATE INDEX idx_seo_analytics_history_user_recorded ON public.seo_analytics_history(user_id, recorded_at);
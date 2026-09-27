-- Add campaign_start_date to seo_analytics table
ALTER TABLE public.seo_analytics 
ADD COLUMN IF NOT EXISTS campaign_start_date date;
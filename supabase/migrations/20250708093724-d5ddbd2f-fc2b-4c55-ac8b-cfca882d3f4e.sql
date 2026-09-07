-- Add starting_views column to campaigns table to track initial view count
ALTER TABLE public.campaigns 
ADD COLUMN starting_views integer DEFAULT 0;

-- Add last_updated column to track when view counts were last fetched
ALTER TABLE public.campaigns 
ADD COLUMN last_view_update timestamp with time zone DEFAULT now();
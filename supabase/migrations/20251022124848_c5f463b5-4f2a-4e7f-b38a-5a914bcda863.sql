-- Add channel analytics fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS channel_url TEXT,
ADD COLUMN IF NOT EXISTS channel_start_date DATE;

COMMENT ON COLUMN public.profiles.channel_url IS 'YouTube channel URL for channel analytics tracking';
COMMENT ON COLUMN public.profiles.channel_start_date IS 'Date when channel analytics campaign started';

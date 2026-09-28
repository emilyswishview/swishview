-- Add channel_analytics_access field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN channel_analytics_access boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.profiles.channel_analytics_access IS 'Grants user access to view their channel analytics section';
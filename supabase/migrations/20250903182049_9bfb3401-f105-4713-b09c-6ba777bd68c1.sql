-- Add Google OAuth fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_picture TEXT,
ADD COLUMN IF NOT EXISTS google_sub TEXT;
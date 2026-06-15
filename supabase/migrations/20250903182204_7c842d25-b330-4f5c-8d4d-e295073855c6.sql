-- Update the handle_new_user function to store Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    google_access_token,
    google_refresh_token,
    google_picture,
    google_sub
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'provider_token',
    NEW.raw_user_meta_data->>'provider_refresh_token',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'sub'
  );
  RETURN NEW;
END;
$$;
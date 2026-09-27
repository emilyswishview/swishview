-- Insert predefined promo codes
INSERT INTO public.promo_codes (code, discount_amount, max_usage, is_active) VALUES
('SV50X9KQ', 50, 100, true),
('SWV100A7MZ', 100, 100, true),
('SV150PQ8R', 150, 100, true),
('SWISH200L4TN', 200, 100, true),
('SV250ZX7H', 250, 100, true),
('SWV300B2YQ', 300, 100, true),
('SV350R9WF', 350, 100, true),
('SWISH400M6JK', 400, 100, true),
('SV450H2DP', 450, 100, true),
('SWV500Q8NZ', 500, 100, true);

-- Add manager assignment column to seo_purchases table
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS assigned_manager text;

-- Add promo code tracking to seo_purchases
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS promo_code_used text;
ALTER TABLE public.seo_purchases ADD COLUMN IF NOT EXISTS discount_applied numeric DEFAULT 0;

-- Update the handle_seo_purchase_completion trigger function to work with new columns
CREATE OR REPLACE FUNCTION public.handle_seo_purchase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only process if status changed to 'completed' and coupon hasn't been generated yet
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.coupon_generated = false THEN
    -- Get user information
    DECLARE
      user_profile RECORD;
      plan_info RECORD;
    BEGIN
      -- Get user profile
      SELECT * INTO user_profile 
      FROM profiles 
      WHERE id = NEW.user_id;
      
      -- Get plan information
      SELECT * INTO plan_info 
      FROM seo_plans 
      WHERE id = NEW.seo_plan_id;
      
      -- Call the generate-coupon function asynchronously
      PERFORM net.http_post(
        url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/generate-coupon',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'userId', NEW.user_id,
          'seoPurchaseId', NEW.id,
          'userEmail', user_profile.email,
          'planName', plan_info.name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to generate coupon for SEO purchase %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Update the stripe-webhook edge function to handle SEO purchases and generate coupons

-- First, let's make sure the generate-coupon function can be called by webhooks
-- Add trigger to automatically generate coupons when SEO purchases are completed
CREATE OR REPLACE FUNCTION public.handle_seo_purchase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for SEO purchase completion
DROP TRIGGER IF EXISTS trigger_seo_purchase_completion ON seo_purchases;
CREATE TRIGGER trigger_seo_purchase_completion
  AFTER UPDATE ON seo_purchases
  FOR EACH ROW
  EXECUTE FUNCTION handle_seo_purchase_completion();
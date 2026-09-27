-- Ensure all partners with assignments have proper role in user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT partner_id, 'partner'::app_role
FROM public.partner_clients
WHERE partner_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'partner'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to automatically add partner role when assigned
CREATE OR REPLACE FUNCTION public.ensure_partner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert partner role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.partner_id, 'partner'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to ensure partner role on assignment
DROP TRIGGER IF EXISTS ensure_partner_role_trigger ON public.partner_clients;
CREATE TRIGGER ensure_partner_role_trigger
  AFTER INSERT ON public.partner_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_partner_role();
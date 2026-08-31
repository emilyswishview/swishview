-- Drop existing restrictive policies on partner_clients
DROP POLICY IF EXISTS "Admins can manage partner-client assignments" ON public.partner_clients;
DROP POLICY IF EXISTS "Partners can view their assigned clients" ON public.partner_clients;

-- Create new RLS policies for partner_clients with profiles.role support
CREATE POLICY "Admins can manage all partner-client assignments"
ON public.partner_clients
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  )
);

CREATE POLICY "Partners can view their assigned clients"
ON public.partner_clients
FOR SELECT
USING (
  partner_id = auth.uid() AND (
    has_role(auth.uid(), 'partner'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'partner'::user_role
    )
  )
);
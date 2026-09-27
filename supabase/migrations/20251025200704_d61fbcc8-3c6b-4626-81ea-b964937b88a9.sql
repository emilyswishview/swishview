-- Drop and recreate the partner_clients RLS policies to fix data access
DROP POLICY IF EXISTS "Partners can view their assigned clients" ON partner_clients;
DROP POLICY IF EXISTS "Admins can manage all partner-client assignments" ON partner_clients;

-- Allow partners to view their assigned clients (simplified check)
CREATE POLICY "Partners can view their assigned clients"
ON partner_clients
FOR SELECT
USING (
  partner_id = auth.uid()
  AND (
    -- Check user_roles table for partner role
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'partner'
    )
    OR
    -- Check profiles table for partner role  
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'partner'
    )
  )
);

-- Allow admins to manage all assignments
CREATE POLICY "Admins can manage all partner-client assignments"
ON partner_clients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
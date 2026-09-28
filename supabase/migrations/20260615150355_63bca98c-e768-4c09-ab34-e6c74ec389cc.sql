CREATE TABLE IF NOT EXISTS public.prospects_employee_permissions (
  id smallint PRIMARY KEY DEFAULT 1,
  can_edit boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_send boolean NOT NULL DEFAULT false,
  can_sync boolean NOT NULL DEFAULT false,
  can_ban boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

GRANT SELECT ON public.prospects_employee_permissions TO authenticated;
GRANT ALL ON public.prospects_employee_permissions TO service_role;

ALTER TABLE public.prospects_employee_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swishview can read employee perms" ON public.prospects_employee_permissions;
CREATE POLICY "swishview can read employee perms"
  ON public.prospects_employee_permissions FOR SELECT
  TO authenticated
  USING (lower(coalesce((auth.jwt() ->> 'email'), '')) LIKE '%@swishview.com');

DROP POLICY IF EXISTS "only emily admin can update employee perms" ON public.prospects_employee_permissions;
CREATE POLICY "only emily admin can update employee perms"
  ON public.prospects_employee_permissions FOR UPDATE
  TO authenticated
  USING (lower(coalesce((auth.jwt() ->> 'email'), '')) = 'emilyadmin@swishview.com')
  WITH CHECK (lower(coalesce((auth.jwt() ->> 'email'), '')) = 'emilyadmin@swishview.com');

INSERT INTO public.prospects_employee_permissions (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;
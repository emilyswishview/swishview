-- Create app_role enum if not exists (add partner role)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'partner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- If enum already exists, add partner role
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role (returns first role found)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create partner_clients table to map partners to their clients
CREATE TABLE IF NOT EXISTS public.partner_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (partner_id, client_id)
);

-- Enable RLS on partner_clients
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_clients
CREATE POLICY "Partners can view their assigned clients"
ON public.partner_clients
FOR SELECT
USING (partner_id = auth.uid() AND public.has_role(auth.uid(), 'partner'));

CREATE POLICY "Admins can manage partner-client assignments"
ON public.partner_clients
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Seed partner accounts
DO $$
DECLARE
  partner_emails TEXT[] := ARRAY[
    'amy@swishview.com',
    'sophie@swishview.email',
    'jasmine@swishview.email',
    'daisy@swishview.com'
  ];
  partner_email TEXT;
  partner_user_id UUID;
BEGIN
  FOREACH partner_email IN ARRAY partner_emails
  LOOP
    -- Check if user exists in auth.users, if not we'll need to create via auth
    SELECT id INTO partner_user_id FROM auth.users WHERE email = partner_email;
    
    IF partner_user_id IS NOT NULL THEN
      -- Add partner role if user exists
      INSERT INTO public.user_roles (user_id, role)
      VALUES (partner_user_id, 'partner')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_partner_clients_partner_id ON public.partner_clients(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_clients_client_id ON public.partner_clients(client_id);
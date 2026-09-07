-- CRM clients (shared across all CRM users)
CREATE TABLE public.crm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_clients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_clients TO authenticated;
GRANT ALL ON public.crm_clients TO service_role;

ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;

-- Access gated by app-level /crm-login screen
CREATE POLICY "Anyone can read crm_clients" ON public.crm_clients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert crm_clients" ON public.crm_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update crm_clients" ON public.crm_clients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete crm_clients" ON public.crm_clients FOR DELETE USING (true);

CREATE TRIGGER crm_clients_updated_at
BEFORE UPDATE ON public.crm_clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prospects (shared across all Prospects users, separate from CRM)
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospects" ON public.prospects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prospects" ON public.prospects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prospects" ON public.prospects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prospects" ON public.prospects FOR DELETE USING (true);

CREATE TRIGGER prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
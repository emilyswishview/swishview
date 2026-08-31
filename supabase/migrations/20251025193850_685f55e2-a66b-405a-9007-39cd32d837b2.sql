-- Add foreign key constraints to partner_clients table
ALTER TABLE public.partner_clients
  DROP CONSTRAINT IF EXISTS partner_clients_partner_id_fkey,
  DROP CONSTRAINT IF EXISTS partner_clients_client_id_fkey,
  DROP CONSTRAINT IF EXISTS partner_clients_assigned_by_fkey;

ALTER TABLE public.partner_clients
  ADD CONSTRAINT partner_clients_partner_id_fkey 
    FOREIGN KEY (partner_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT partner_clients_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT partner_clients_assigned_by_fkey 
    FOREIGN KEY (assigned_by) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
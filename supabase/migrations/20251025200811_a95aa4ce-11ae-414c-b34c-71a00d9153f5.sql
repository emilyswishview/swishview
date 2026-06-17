-- Secure function to fetch partner clients with profile data
create or replace function public.get_clients_for_partner()
returns table (
  id uuid,
  email text,
  full_name text,
  channel_url text,
  channel_name text,
  assigned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.email,
         p.full_name,
         p.channel_url,
         p.channel_name,
         pc.assigned_at
  from partner_clients pc
  join profiles p on p.id = pc.client_id
  where pc.partner_id = auth.uid()
  order by pc.assigned_at desc;
$$;
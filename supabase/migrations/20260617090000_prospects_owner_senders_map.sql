-- Prospects: extend per-rep visibility to cover all allowed sender mailboxes
-- per logged-in user (e.g. serena@ can also see leads assigned to ashley@).

create or replace function public.prospects_owner_senders(jwt_email text)
returns text[]
language sql
immutable
as $$
  select case lower(coalesce(jwt_email, ''))
    when 'serena@swishview.com' then array['serena@swishview.com','ashley@swishview.com']
    when 'hazel@swishview.com'  then array['hazel@swishview.com','rachel@swishview.email']
    else array[lower(coalesce(jwt_email, ''))]
  end
$$;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='prospects' loop
    execute format('drop policy if exists %I on public.prospects', p.policyname);
  end loop;
end $$;

alter table public.prospects enable row level security;

create policy "prospects_select_assigned"
  on public.prospects
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or lower(coalesce(assigned_sender, '')) = any (public.prospects_owner_senders((auth.jwt() ->> 'email')::text))
  );

create policy "prospects_update_assigned"
  on public.prospects
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or lower(coalesce(assigned_sender, '')) = any (public.prospects_owner_senders((auth.jwt() ->> 'email')::text))
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or lower(coalesce(assigned_sender, '')) = any (public.prospects_owner_senders((auth.jwt() ->> 'email')::text))
  );

create policy "prospects_insert_admin"
  on public.prospects
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "prospects_delete_admin"
  on public.prospects
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select, insert, update, delete on public.prospects to authenticated;
grant all on public.prospects to service_role;

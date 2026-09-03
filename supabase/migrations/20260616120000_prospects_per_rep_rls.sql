-- Prospects: scope SELECT/UPDATE to assigned sales rep (admin sees all)

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
    or lower(coalesce(assigned_sender, '')) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
  );

create policy "prospects_update_assigned"
  on public.prospects
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or lower(coalesce(assigned_sender, '')) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or lower(coalesce(assigned_sender, '')) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
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

create or replace function public.guard_prospect_assigned_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_sender is distinct from old.assigned_sender then
    if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
      raise exception 'Only admins can reassign prospects';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_prospect_assigned_sender on public.prospects;
create trigger trg_guard_prospect_assigned_sender
  before update on public.prospects
  for each row execute function public.guard_prospect_assigned_sender();

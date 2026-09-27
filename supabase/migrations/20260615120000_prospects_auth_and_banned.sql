-- Prospects auth: extend user_roles with employee role + session token, banned columns on prospects

-- 1. Add 'employee' to existing app_role enum (admin/user/partner already present)
do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname='app_role' and e.enumlabel='employee') then
    alter type public.app_role add value 'employee';
  end if;
end $$;

-- 2. Add columns for single-device session enforcement
alter table public.user_roles
  add column if not exists active_session_id text,
  add column if not exists last_seen_at timestamptz default now();

-- Allow authed users to update their own session token row
drop policy if exists "Users update own session token" on public.user_roles;
create policy "Users update own session token" on public.user_roles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Bootstrap trigger: first signup becomes admin if no admin yet
create or replace function public.handle_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_first_admin on auth.users;
create trigger on_auth_user_created_first_admin
  after insert on auth.users
  for each row execute function public.handle_first_admin();

-- 4. Prospects: banned columns + index
alter table public.prospects
  add column if not exists is_banned boolean not null default false,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz;

create index if not exists prospects_is_banned_idx on public.prospects (is_banned);

-- 5. Tighten prospects RLS: SELECT/UPDATE authed, INSERT/DELETE admin only
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='prospects' loop
    execute format('drop policy if exists %I on public.prospects', p.policyname);
  end loop;
end $$;

alter table public.prospects enable row level security;

create policy "prospects_select_authed" on public.prospects
  for select to authenticated using (true);

create policy "prospects_update_authed" on public.prospects
  for update to authenticated using (true) with check (true);

create policy "prospects_insert_admin" on public.prospects
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "prospects_delete_admin" on public.prospects
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select, insert, update, delete on public.prospects to authenticated;
grant all on public.prospects to service_role;

-- 6. Prevent non-admins from flipping is_banned
create or replace function public.guard_prospect_ban_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_banned is distinct from old.is_banned then
    if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
      raise exception 'Only admins can change banned status';
    end if;
    new.banned_at := case when new.is_banned then now() else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_prospect_ban on public.prospects;
create trigger trg_guard_prospect_ban
  before update on public.prospects
  for each row execute function public.guard_prospect_ban_change();

-- Production RLS for public.prospects (applied live to project nuxixhoogohqligzgbdm
-- on 2026-06-27 via the Management API; this migration captures that state so the
-- repo matches the database and a future `supabase db push`/reset won't reopen the hole).
--
-- Why this exists: the table shipped with permissive "Anyone can read/insert/update/
-- delete USING(true)" policies. Because the browser bundles the anon publishable key,
-- that meant ANY visitor could read or DELETE every prospect. /prospects authenticates
-- with real Supabase Auth (see src/hooks/useProspectsSession.ts), so we can scope access:
--   * admin (emilyadmin@swishview.com) -> full access
--   * sales reps -> only rows whose assigned_sender is one of their mailboxes
--   * anon / logged-out -> nothing
-- Edge functions use the service_role key, which bypasses RLS, so the daily sync and
-- email queue are unaffected.

-- Maps a logged-in user's email to every sender mailbox they own.
create or replace function public.prospects_owner_senders(jwt_email text)
returns text[] language sql immutable as $fn$
  select case lower(coalesce(jwt_email,''))
    when 'serena@swishview.com' then array['serena@swishview.com','ashley@swishview.com']
    when 'hazel@swishview.com'  then array['hazel@swishview.com','rachel@swishview.email']
    else array[lower(coalesce(jwt_email,''))]
  end
$fn$;
grant execute on function public.prospects_owner_senders(text) to authenticated, service_role;

alter table public.prospects enable row level security;

-- Drop the permissive legacy policies and any earlier per-rep attempts.
drop policy if exists "Anyone can read prospects"   on public.prospects;
drop policy if exists "Anyone can insert prospects" on public.prospects;
drop policy if exists "Anyone can update prospects" on public.prospects;
drop policy if exists "Anyone can delete prospects" on public.prospects;
drop policy if exists prospects_select_authed    on public.prospects;
drop policy if exists prospects_update_authed     on public.prospects;
drop policy if exists prospects_insert_admin      on public.prospects;
drop policy if exists prospects_delete_admin      on public.prospects;
drop policy if exists prospects_select_assigned   on public.prospects;
drop policy if exists prospects_update_assigned   on public.prospects;
drop policy if exists prospects_select on public.prospects;
drop policy if exists prospects_update on public.prospects;
drop policy if exists prospects_insert on public.prospects;
drop policy if exists prospects_delete on public.prospects;

-- Admin = whitelisted admin email OR a user_roles 'admin' row (defence in depth).
create policy prospects_select on public.prospects for select to authenticated
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'emilyadmin@swishview.com'
  or public.has_role(auth.uid(),'admin'::public.app_role)
  or lower(coalesce(assigned_sender,'')) = any(public.prospects_owner_senders(auth.jwt()->>'email'))
);

create policy prospects_update on public.prospects for update to authenticated
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'emilyadmin@swishview.com'
  or public.has_role(auth.uid(),'admin'::public.app_role)
  or lower(coalesce(assigned_sender,'')) = any(public.prospects_owner_senders(auth.jwt()->>'email'))
)
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'emilyadmin@swishview.com'
  or public.has_role(auth.uid(),'admin'::public.app_role)
  or lower(coalesce(assigned_sender,'')) = any(public.prospects_owner_senders(auth.jwt()->>'email'))
);

create policy prospects_insert on public.prospects for insert to authenticated
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'emilyadmin@swishview.com'
  or public.has_role(auth.uid(),'admin'::public.app_role)
);

create policy prospects_delete on public.prospects for delete to authenticated
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'emilyadmin@swishview.com'
  or public.has_role(auth.uid(),'admin'::public.app_role)
);

grant select, insert, update, delete on public.prospects to authenticated;
grant all on public.prospects to service_role;

-- Ensure the admin account is recognised by has_role() as well.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
where lower(email) = 'emilyadmin@swishview.com'
on conflict do nothing;

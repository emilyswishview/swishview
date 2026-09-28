-- Bounced email tracking. Run in Supabase SQL editor.

create table if not exists public.prospect_email_bounces (
  id uuid primary key default gen_random_uuid(),
  sender text not null,                -- mailbox that the bounce arrived in (e.g. amelia@swishview.email)
  recipient text,                      -- the email address that bounced
  subject text,                        -- original subject (if recoverable)
  reason text,                         -- parsed bounce reason / diagnostic
  smtp_code text,                      -- e.g. 5.1.1
  bounce_type text,                    -- 'hard' | 'soft' | 'unknown'
  gmail_message_id text not null,      -- Gmail message id of the bounce notification
  gmail_thread_id text,
  received_at timestamptz,             -- when the bounce email was received
  raw_snippet text,                    -- short snippet for UI
  created_at timestamptz not null default now(),
  unique (sender, gmail_message_id)
);

create index if not exists idx_peb_sender on public.prospect_email_bounces(sender);
create index if not exists idx_peb_recipient on public.prospect_email_bounces(recipient);
create index if not exists idx_peb_received_at on public.prospect_email_bounces(received_at desc);

grant select, insert, update, delete on public.prospect_email_bounces to authenticated;
grant all on public.prospect_email_bounces to service_role;

alter table public.prospect_email_bounces enable row level security;

drop policy if exists "authenticated read bounces" on public.prospect_email_bounces;
create policy "authenticated read bounces"
on public.prospect_email_bounces
for select
to authenticated
using (true);

drop policy if exists "service role write bounces" on public.prospect_email_bounces;
create policy "service role write bounces"
on public.prospect_email_bounces
for all
to service_role
using (true)
with check (true);

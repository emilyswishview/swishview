-- Cleanup unused auto-discovered "Workspace Contacts" rows from prospects.
--
-- Run this in the Supabase SQL Editor for the swishview project:
--   https://supabase.com/dashboard/project/nuxixhoogohqligzgbdm/sql/new
--
-- Context:
--   The Workspace-Contacts auto-discovery feature is permanently disabled in
--   the app (see src/pages/Prospects.tsx `discoverFromWorkspace`, which is no
--   longer wired to any button or effect). The rows it imported live in
--   public.prospects with auto_discovered = true and have NO YouTube channel
--   link. They are never surfaced in the UI (the "Discovered" tab is hidden)
--   and they bloated the table to ~85k rows, which made even a COUNT(*) time
--   out and buried freshly-imported leads.
--
-- IMPORTANT — why the previous version of this script deleted nothing:
--   A BEFORE-INSERT trigger on public.prospects always populates
--   `assigned_sender` (round-robin across the outreach mailboxes). The old
--   script required `assigned_sender IS NULL OR = ''`, so it matched ZERO
--   rows. Do NOT gate cleanup on assigned_sender. The real signal for junk is
--   `auto_discovered = true AND channel_link is empty` (an email-only contact
--   with no channel to ever enrich).
--
-- Strategy — delete auto_discovered rows that are pure junk:
--   * auto_discovered = true
--   * no YouTube channel link (channel_link is null/empty)
--   * not banned
--   * no manual status (status in '', 'NA', 'new')
--
-- Idempotent: safe to re-run. Deletes nothing once the table is clean.
--
-- History: 2026-06-27 — this exact predicate was executed against the live
--   project (nuxixhoogohqligzgbdm) via the REST API, removing 74,954 junk
--   rows (85k -> 10.3k), after which prospects_dedupe_by_email removed a
--   further ~1.5k duplicate-email rows (-> ~8.7k unique prospects).

begin;

-- 1. Sanity check — read the NOTICE to see how many will go.
do $$
declare n bigint;
begin
  select count(*) into n
  from public.prospects p
  where p.auto_discovered = true
    and nullif(btrim(p.channel_link), '') is null
    and coalesce(p.is_banned, false) = false
    and coalesce(p.status, '') in ('', 'NA', 'new');
  raise notice 'Will delete % auto_discovered junk prospects', n;
end $$;

-- 2. Delete in batches so a single statement doesn't hit the timeout.
do $$
declare deleted bigint;
begin
  loop
    with victims as (
      select p.id
      from public.prospects p
      where p.auto_discovered = true
        and nullif(btrim(p.channel_link), '') is null
        and coalesce(p.is_banned, false) = false
        and coalesce(p.status, '') in ('', 'NA', 'new')
      limit 5000
    )
    delete from public.prospects p
    using victims v
    where p.id = v.id;

    get diagnostics deleted = row_count;
    raise notice 'Batch deleted %', deleted;
    exit when deleted = 0;
  end loop;
end $$;

commit;

-- 3. Reclaim space + refresh planner stats so reads (and COUNT(*)) get fast.
vacuum (analyze) public.prospects;

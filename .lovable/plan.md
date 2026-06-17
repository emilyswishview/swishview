# Production hardening for /prospects

Three concrete fixes, each scoped server-side so they work across the entire database (not just the loaded page).

## 1. Per-sales-rep visibility (assigned leads only)

The `prospects` table already has an `assigned_sender` column (sender email like `amelia@swishview.com`). I'll use it as the access boundary:

- **DB / RLS** (new migration):
  - Tighten `prospects_select_authed`: admin sees all; employee sees only `assigned_sender = lower(auth.jwt() ->> 'email')` (plus rows they themselves created).
  - Same predicate on `prospects_update_authed` so an employee cannot edit other reps' rows.
  - Banned tab and bulk admin actions stay admin-only (already enforced).
- **Client (`Prospects.tsx`)**:
  - Add `if (!isAdmin) q.eq('assigned_sender', authedEmail)` to every list/count query (main page load, banned tab count, sync `countPending`, conversation refresh email gather).
  - Hide "Banned Leads" tab, Import, Bulk-Ban, Delete, employee-permissions, and the "Sales Rep" column editor from non-admins.
  - Employees see header chip: `signed in as <email> · your assigned leads (N)`.
- **Login (`ProspectsLogin.tsx`)**:
  - Block sign-in for employees whose email is not in `DEFAULT_SENDERS` AND who have zero assigned rows — show "No leads assigned. Contact admin." instead of dropping them on an empty table.
  - Keep admin bootstrap unchanged.

## 2. Sync that actually drains every page

Current `syncAll` already kicks the server function and polls `countPending`, but the polling condition double-counts rows missing `channel_name` even after the edge function marked them with `lastSyncError` (broken link). That makes the progress bar never reach 0, looks "stuck", and the toast is wrong.

Fixes:
- **Edge function `prospects-daily-sync`** (`index.ts`):
  - On failure path, also write `last_fetched_at = now()` on the top-level column (today's date), so a broken link is counted as "attempted today" and stops blocking the pending counter.
  - Accept optional `ownerEmail` in the body; when present, scope the sweep to `assigned_sender = ownerEmail` so an employee's "Sync my leads" button doesn't fight admin-wide sync.
  - Increase `CONCURRENCY` to 24 and add a hard 3-attempt cap per row per day using an in-memory set, so a flaky YouTube response doesn't loop forever.
- **Client `syncAll`**:
  - Pass `ownerEmail` when employee.
  - Replace the polling `countPending` query with one that exactly matches the edge-function "needs sync" predicate (channel_link present AND (`last_fetched_at` null OR < today) AND not banned).
  - Show "Synced X · Failed Y · Skipped Z" using server-returned counters (read from a new `prospects_sync_runs` row written at end of each invocation) instead of inferring from `initialPending`.
  - Disable the button (with spinner + "Syncing across all pages…") and re-enable only when `countPending() === 0` or user cancels.

## 3. Dedupe across the whole database

The manual `dedupe()` button only de-dupes the rows currently in React state (≤ 200 per page). Auto-dedupe already calls the SQL RPC `prospects_dedupe_by_email`, which works across the whole table.

Fix:
- **Client `dedupe()`**: call `supabase.rpc('prospects_dedupe_by_email')`. Show `Removed N duplicate row(s) across the entire database`. Refetch current page after.
- **DB**: extend `prospects_dedupe_by_email` (new migration) to:
  - Also collapse duplicates by normalized `channel_link` (lowercased, strip `?si=…` query), not just by email — this catches the same channel uploaded twice with different alt emails.
  - Keep the row with the highest "fullness score" (most non-empty fields in `data` JSON), same heuristic as the client side.
  - Return `(removed_count, kept_count)` so the toast can be accurate.
  - Restrict execution to admin (via `has_role(auth.uid(), 'admin')`).

## Files touched

```text
supabase/migrations/<new>_prospects_per_rep_rls.sql        new
supabase/migrations/<new>_prospects_dedupe_v2.sql          new
supabase/functions/prospects-daily-sync/index.ts           edit
src/pages/Prospects.tsx                                    edit (list query, syncAll, dedupe, UI gating)
src/pages/ProspectsLogin.tsx                               edit (employee "no leads" guard)
src/hooks/useProspectsSession.ts                           edit (expose authedEmail lowercase + isSalesRep flag)
```

## Verification

After implementing, I'll run a Playwright smoke pass against the live preview:
1. Sign in as admin → Sync button shows progress that monotonically increases, toast at end matches DB count of rows with `channel_name IS NULL AND channel_link IS NOT NULL`.
2. Sign in as admin → Dedupe button → toast shows "Removed N across entire database"; running it again shows "No duplicates found".
3. Sign in as an employee whose email matches an `assigned_sender` → page only shows those rows; admin tabs hidden.
4. Sign in as an employee with zero assignments → blocked at login with clear message.

No other UI or feature is touched.

# /prospects — Auth, Roles, Banned Leads, Excel Upload

## 1. Database migration

- `app_role` enum: `admin`, `employee`
- `user_roles(user_id, role, active_session_id text, last_seen_at)` + grants + RLS + `has_role()` security-definer
- `prospects`: add `is_banned bool default false`, `ban_reason text`, `banned_at timestamptz`
- Tighten `prospects` RLS:
  - `SELECT/UPDATE`: any authenticated user
  - `INSERT/DELETE`: admin only (via `has_role`)
- Index on `is_banned` for fast list filter
- Trigger: first user that signs up automatically gets `admin`; subsequent signups left without role (admin assigns)

## 2. Auth page (`/prospects-login` → `ProspectsAuth.tsx`)

- Real Supabase email/password sign-in (replaces hardcoded creds)
- "Create admin" form shown ONLY while no admin exists in DB (bootstrap)
- After login (admin only) the page also shows:
  - **Add Employee** form (creates auth user + assigns `employee` role via admin-callable edge function `prospects-admin-create-user`)
  - **Upload Excel** drop zone — admin can upload any Email/Channel sheet for future imports
  - **Import June 2026 Seed** button — one-click import of the 3,833 rows from the attached `Prospects_DB_update.xlsx` (bundled as `src/data/prospectsSeed.json`; dedupes by email)

## 3. Single-device enforcement

- On every successful sign-in, generate a fresh session UUID, write it to `user_roles.active_session_id`, store in `localStorage`.
- New `useProspectsSession` hook polls every 20 s: if DB token ≠ local token → `supabase.auth.signOut()` + redirect to login with toast "Signed in elsewhere". This kicks the older device.

## 4. Banned leads

- Default list query gets `.eq("is_banned", false)`.
- New tab toggle next to "All / Discovered / Prospects": **Banned Leads** — shows only `is_banned=true`.
- Per-row admin action: **Ban lead** (prompts reason) / **Unban**. Bulk-ban for selected rows.
- Employees: rows render without these actions; their UPDATE is blocked from `is_banned` column via a `BEFORE UPDATE` trigger that requires admin.

## 5. Employee permissions (UI gates; RLS backs critical ones)

Employees can: view list, edit status/notes/most fields, send outreach/replies, run sync.
Employees cannot: delete rows, ban/unban, change `is_banned`, upload Excel, create users, see Banned tab.

## 6. Files touched

- `supabase/migrations/<new>.sql` — schema above
- `supabase/functions/prospects-admin-create-user/index.ts` — admin-only employee provisioning
- `src/data/prospectsSeed.json` — converted from your xlsx (Email + Channel)
- `src/pages/ProspectsLogin.tsx` — rewritten as `ProspectsAuth`
- `src/hooks/useProspectsSession.ts` — auth + role + single-device check
- `src/components/prospects/AdminUploadDialog.tsx` — Excel/seed import dialog
- `src/pages/Prospects.tsx` — swap localStorage guard for hook, add banned tab + ban/unban actions + admin upload button, hide destructive actions for employees, add `.eq('is_banned', false)` to default queries

## 7. Bootstrap UX

After deploy:
1. Visit `/prospects-login` → see "Create first admin" form (only the first time).
2. Sign in as admin → "Add Employee" + "Import June 2026 Seed" buttons appear.
3. Click **Import Seed** once to load the 3,833 rows.

If approved I implement all of the above in one pass.

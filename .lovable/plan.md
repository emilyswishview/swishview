## Changes

### 1. Sign-in toast (ProspectsLogin.tsx)
- Replace "Welcome back · Signed in as {role}" with "Welcome back, {SalesRepName}".
- Mapping by signed-in email:
  - `serena@swishview.com` → "Sales Representative Adarsh"
  - `hazel@swishview.com` → "Sales Representative Shivam"
  - admins / unknown → "Sales Representative" (or admin name if available).

### 2. Fetch/Sync from row 1 → last (Prospects.tsx `syncAll`)
- Ensure the prospects query is explicitly ordered ascending (e.g. `order("id", { ascending: true })`) so the sequential loop starts at row 1 and ends at the last row, instead of relying on default order.
- Reset progress at 0/total before the loop.

### 3. "Select N rows" quick action for sales reps
- In the toolbar next to the existing "Select all matching", add a small inline input + button: "Select first [N] rows" (max = visible total).
- Selecting picks the top N rows of the currently filtered / sender-scoped list.

### 4. Cross-sender email visibility
- Today reps only see conversations involving their own sender email.
- Update the conversation fetch so any `@swishview.com` sender's emails to/from a prospect are visible to all signed-in sales reps (still hidden from logged-out users). Admin behavior unchanged.
- Note in the conversation header which sender sent each message (already shown via `employee_email`).

### 5. Conversations cell — drop the green dot badge
- Remove the green "has conversation" indicator dot in the Conversations column; rely on the "View" / count text only.

### 6. Bulk AI dialog — tabs + admin gating
- Wrap the Bulk dialog body in shadcn `Tabs`:
  - Default tab: **Template** (subject, body, find/replace, "Draft All from Template", send queue).
  - Second tab: **AI** (prompt textarea, "Draft All with AI").
- Only render/enable the AI tab for admins (`isAdmin`). Non-admins see only the Template tab.
- Hide the "Bulk AI Outreach" wording for non-admins → title becomes "Bulk Outreach · N leads".

### 7. Single-conversation modal polish
- Re-style the per-prospect conversation modal:
  - Cleaner message list using shadcn `Card` items, sender avatar/initial, relative time + tooltip with full datetime.
  - Sticky header with prospect name + channel link, sticky footer with "Compose new email" / "AI draft outreach" (AI button admin-only).
  - Group messages by thread; collapse older threads by default.
  - Show attachment chips with filename + size.
  - Empty state keeps current copy.

## Out of scope / assumptions
- No DB schema or RLS changes; cross-sender visibility is achieved purely by widening the client query (server already allows reads of `@swishview.com` rows for authenticated reps based on existing code path at lines 619–675).
- Name mapping for the toast is hardcoded client-side (no profile table change).
- "Select N rows" applies to currently loaded/filtered rows only; does not auto-page.

Confirm and I'll implement all seven in one pass.
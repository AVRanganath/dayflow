# S12 — Dashboards (employee + admin + analytics charts)

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S12-log.md` and commit before you finish.

- **Owns:** `apps/web` `/dashboard` for both roles + the analytics charts.
  **Produces:** the role-aware landing page — Employee Dashboard (PAGE 3) and Admin
  Dashboard (PAGE 4) with live data, charts, work-status indicators (ADR-017), and
  the new salary-engine totals (ADR-013/014). This is **Differentiator #2**
  (analytics dashboard, `plan.md §2`).
- **Depends on:** S10 (web foundation), S06 (attendance API), S07 (leave API),
  S08 (payroll API). **Parallel with:** S11, S13, S14, S15.

## Goal
Build the `/dashboard` route that renders the **correct dashboard by role**
(`useAuth().user.role`): the Employee Dashboard for `EMPLOYEE`, the Admin Dashboard
for `ADMIN`/`HR`. Wire both to the real API through the S10 client, with a working
Check In/Out button and live analytics charts (Recharts) for admin. Follow PAGE 3
and PAGE 4 of `docs/UI_DESIGN_PROMPT.md` exactly.

## Preconditions
- S10, S06, S07, S08 are `DONE` in `build/STATE.md`.
- From S10: api client, `useAuth()`, `AppShell`/`Sidebar`/`Header`, and UI
  primitives (`StatsCard`, `StatusBadge`, `DataTable`, `Button`, `ProgressBar`,
  `Avatar`, `Toast`, `EmptyState`), plus `formatINR`/`formatHours`/`formatDate`.
- Endpoints available (`docs/API.md`): `POST /attendance/check-in`,
  `POST /attendance/check-out`, `GET /attendance/me`, `GET /attendance/summary`,
  `GET /leaves`, `PATCH /leaves/:id/approve`, `PATCH /leaves/:id/reject`,
  `GET /leaves/balance/me`, `GET /payroll`. DB is seeded (rich demo data, §2.8).
- api on :8000, web on :3000 for the acceptance run; you can log in via S11 or by
  seeding a session.

## Deliverables (exact files)
- **`apps/web/src/app/(protected)/dashboard/page.tsx`** — inside the S10 protected
  route group; reads `useAuth().user.role` and renders `<EmployeeDashboard/>` for
  `EMPLOYEE` else `<AdminDashboard/>` (ADMIN/HR). Wrapped in `AppShell` with the
  header greeting (e.g. "Good morning, John! 👋") and the **current user's avatar
  carrying the work-status indicator** 🟢 present / 🟡 absent / ✈️ on leave (ADR-017,
  from the user's `workStatus`).
- **`apps/web/src/features/dashboard/EmployeeDashboard.tsx`** — PAGE 3, a 2×2 card
  grid plus a bottom quick-stats row:
  - **Today's Attendance** card — status badge ("Checked In" green / "Not Checked
    In" gray), check-in time, hours-worked-today, and a large **Check In / Check
    Out** button wired to `POST /attendance/check-in` and `/check-out`. Derive
    today's state from `GET /attendance/me?range=daily`; after check-in/out,
    refetch so the card reflects the change; toast on success/error.
  - **Leave Balance** card — from `GET /leaves/balance/me`: Paid/Sick/Casual as
    `ProgressBar`s (remaining/allocated), reflecting the new admin **allocations**
    (ADR-018 balances), plus an "Apply for Leave" button (links to `/leaves`; the modal
    itself is S14). If a **Salary** summary card is shown, its figures come from the
    **new salary engine** (ADR-013/014 component-based gross/net + payable days), not
    legacy columns.
  - **Recent Activity** card — a short timestamped list (derive from recent
    attendance/leave items; if no activity feed exists, compose from the fetched
    attendance + leave history).
  - **This Week's Summary** card — Mon–Fri mini grid colored by status
    (green=present, red=absent, yellow=half-day, blue=leave) from
    `GET /attendance/me?range=weekly`, plus total hours + attendance rate.
  - **Bottom quick-stats row** — Total Working Days / Present / Absent / Leave for
    the period.
- **`apps/web/src/features/dashboard/AdminDashboard.tsx`** — PAGE 4:
  - **Row 1 — 4 `StatsCard`s:** Total Employees, Present Today (with %),
    Pending Leave Requests (clickable → `/leaves/approvals`), Total Payroll This
    Month (`formatINR`, ADR-008). Source: `GET /attendance/summary`
    (`totalEmployees`, `present`, `absent`, `onLeave`), pending count from
    `GET /leaves?status=PENDING`, payroll total from `GET /payroll` — the **Total
    Payroll** stat uses the **new salary-engine totals** (ADR-013/014: component-based
    gross/net, attendance-driven payable days), not any legacy allowance columns.
  - **Row 2 left (60%) — Recent Leave Requests `DataTable`:** columns Employee
    (avatar+name + **work-status indicator** 🟢/🟡/✈️ from `workStatus`, ADR-017) |
    Leave Type (colored `StatusBadge`) | Dates | Status | Actions.
    Pending rows get inline **Approve/Reject** icon buttons calling
    `PATCH /leaves/:id/approve` and `/reject` (reject needs a `{ reason }` — ADR-006;
    prompt for it), then optimistically update / refetch and toast. "View All" →
    `/leaves/approvals`.
  - **Row 2 right (40%) — Attendance Overview donut** (Recharts `PieChart`):
    Present/Absent/Half-day/On-leave from the summary, colored
    green/red/yellow/blue, with a "Today, <date>" subtitle.
  - **Row 3 — Department Headcount bar chart** (Recharts `BarChart`, horizontal):
    per-department counts. Source it from `GET /employees` grouped by department
    (or a summary endpoint if S05 exposed one); if unavailable, note the gap and
    derive from whatever is fetched — do not fabricate.
- **`apps/web/src/features/dashboard/charts/`** — thin Recharts wrappers
  (`AttendanceDonut.tsx`, `DepartmentBarChart.tsx`) with the design-system colors,
  responsive containers, and accessible labels. Keep chart config here so pages
  stay clean.
- **`apps/web/src/features/dashboard/hooks.ts`** — typed data hooks
  (`useTodayAttendance`, `useLeaveBalance`, `useAdminSummary`, `usePendingLeaves`,
  …) that call the S10 client and return typed loading/error/data. Show skeletons
  while loading and `EmptyState` when empty.

## Implementation notes
- **Charting lib: Recharts** (add to `apps/web` deps). Wrap charts in
  `ResponsiveContainer`; use the palette from `docs/UI_DESIGN_PROMPT.md`
  (present=`#10B981`, absent=`#EF4444`, half-day=`#F59E0B`, leave=`#714B67`/plum).
- All money uses `formatINR` (ADR-008). All responses arrive **unwrapped** from the
  S10 client (envelope handled there, ADR-010) — code against `data` shapes only.
- **Work-status indicator (ADR-017).** Render 🟢 present / 🟡 absent / ✈️ on leave from
  the server-computed `workStatus` (`PRESENT|ABSENT|ON_LEAVE`) that S06 exposes — on
  employee cards/rows (admin table) and on the current user's avatar. Do **not**
  recompute status client-side; consume `workStatus` as-is.
- **Salary engine totals (ADR-013/014).** The admin Total Payroll stat and any employee
  salary/leave cards read the **new component-based salary structure** (gross =
  sum(earning components); net = gross − employee PF − professional tax, prorated by
  payable days) and the **allocation-based** leave balances (ADR-018). Do not reference
  the old conveyance/medical/special allowance columns.
- Role gate: employees must never see admin data. `EmployeeDashboard` calls only
  `/me` + balance endpoints; admin-only endpoints are called only from
  `AdminDashboard`. "Admin" = ADMIN **or** HR (ADR-001).
- Check In/Out is the only **mutation** an employee performs here and it must
  reflect on refresh (acceptance). Approve/Reject are the admin mutations and must
  hit the API and update the table.
- Handle loading/empty/error for every fetch (skeleton + `EmptyState` + toast on
  error). No `any`; reuse `@dayflow/shared` types; JSDoc exported components.
- Do **not** build the full Leave/Attendance/Payroll pages (S14/S15) or the
  employee directory (S13) — only the dashboard reads. Buttons that lead elsewhere
  just `router.push` to those routes (which may be placeholders until their session
  lands).
- If a needed shape isn't in `@dayflow/shared`, add a minimal web-local type and
  note it in `STATE.md` "Blockers/notes" rather than editing another session's
  files.

## Acceptance criteria
Run and confirm each (api on :8000, web on :3000, DB seeded):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] Logged in as `john@dayflow.com` (EMPLOYEE): the Employee Dashboard shows real
      leave balances (reflecting admin **allocations**, ADR-018) and any salary card
      reflecting the **new salary structure** (ADR-013/014), plus this-week/summary
      data, and the **Check In/Out button works** — after clicking, a refresh reflects
      the new attendance state (and the avatar's work-status flips to 🟢).
- [ ] Logged in as `admin@dayflow.com` (ADMIN): the Admin Dashboard shows the 4
      live stat cards (**Total Payroll uses the new salary-engine totals**, ADR-013/014),
      the Recent Leave Requests table, and the two charts (attendance donut + department
      bar) rendered from **seed data** (analytics charts still present).
- [ ] **Work-status indicator (ADR-017):** employee rows/cards and the current user's
      avatar show the correct 🟢/🟡/✈️ from `workStatus` (present after check-in,
      ✈️ for an approved-leave employee, 🟡 otherwise).
- [ ] **Approve/Reject from the dashboard** hits the API (`PATCH /leaves/:id/…`)
      and the row/pending count updates (reject captures a reason).
- [ ] The correct dashboard renders per role (employee vs admin) with no leakage of
      admin data to employees.
- [ ] Loading skeletons and empty/error states appear where data is absent.

## On completion (Step 6)
- `build/STATE.md`: set S12 → `DONE`; under "Interfaces produced (detail)" note the
  `/dashboard` route (role-switched), the `features/dashboard/*` components + hooks,
  the Recharts dependency, the `workStatus` indicator consumption (ADR-017), the
  salary-engine total source (ADR-013/014), and which endpoints are consumed. Flag any
  API shape gap you had to work around (e.g. department headcount or missing
  `workStatus`) under "Blockers/notes".
- `build/logs/S12-log.md`: from `_TEMPLATE.md` — record the charting setup, the
  activity-feed derivation, and any endpoint that didn't return the expected shape.

## ▶ Copy-paste prompt
```
You are running build session S12 (Dashboards) for the Dayflow HRMS monorepo. This
is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md,
   then build/sessions/S12-dashboards.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md PAGE 3 (Employee Dashboard) + PAGE 4 (Admin Dashboard),
   docs/API.md §3 (attendance), §4 (leave), §5 (payroll), and docs/DECISIONS.md
   (ADR-001 roles, ADR-006 approve/reject, ADR-008 INR, ADR-010 envelope, ADR-017
   work-status indicator, ADR-013/014 salary engine). Skim the S10 log for the api
   client, useAuth, AppShell, and UI primitive names.
2. Verify the preconditions (S10, S06, S07, S08 DONE; api on :8000, web on :3000, DB
   seeded). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s12-dashboards, build ONLY
   the Deliverables — the role-switched /dashboard, EmployeeDashboard (with a working
   Check In/Out button and live leave balance/week summary) and AdminDashboard (4
   stat cards with Total Payroll from the new salary-engine totals, Recent Leave
   Requests table with inline approve/reject, attendance donut + department bar charts
   via Recharts), plus the ADR-017 work-status indicator (🟢/🟡/✈️) on employee
   cards/rows and the current user's avatar, wired to the real API through the S10
   client. Run every Acceptance criteria command and confirm it passes (check in/out
   as employee; approve/reject as admin), then update build/STATE.md and write
   build/logs/S12-log.md, and commit using Conventional Commits (no AI co-author
   line).
4. Finish with a handoff summary: what's done and what's now unblocked.

Stay strictly in scope — dashboards only; do NOT build the full leave/attendance/
payroll pages (S14/S15) or the employee directory (S13). Follow
docs/UI_DESIGN_PROMPT.md precisely for layout/colors/charts. When the spec is
ambiguous, follow docs/DECISIONS.md. Begin.
```

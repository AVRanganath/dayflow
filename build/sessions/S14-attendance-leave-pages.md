# S14 — Attendance & Leave Pages

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S14-log.md` and commit before you finish.

- **Owns:** `apps/web/app/(app)/attendance/*`, `apps/web/app/(app)/leaves/*`, and
  `apps/web/app/(app)/leaves/approvals/*` (PAGE 7, PAGE 8, PAGE 9 in
  `docs/UI_DESIGN_PROMPT.md`). **Produces:** the attendance page (check-in/out,
  daily/weekly/monthly views, admin all-employees view + CSV), the leave management
  page (balances, apply modal, history), and the admin leave-approvals page.
- **Depends on:** S10 (web foundation: Next scaffold, design system, `apiClient`,
  auth/session context, shared UI components, app shell), S06 (attendance API), and
  S07 (leave API). **Parallel with:** S11, S12, S13, S15 (disjoint file trees).

## Goal
Build the three time/leave pages against the real API per `docs/UI_DESIGN_PROMPT.md`
PAGE 7–9. Employees check in/out and see their attendance and leave; admins/HR see
all-employee attendance (with CSV export) and approve/reject leave with comments. If
S09 (SSE) is present, subscribe so approvals reflect immediately (differentiator #1);
otherwise reflect on refresh. Reuse S10's shell and components; no API changes.

## Preconditions
- S10 is `DONE` (Next 14 App Router on **:3000**, Tailwind design tokens from the UI
  spec, `apiClient` with auth/refresh, auth/session context exposing current user +
  role, and the shared components: Sidebar, Header, StatsCard, DataTable, StatusBadge,
  Modal, DatePicker, Avatar, EmptyState, Toast, form fields, ProgressBar). If missing,
  stop and report.
- S06 is `DONE`: `POST /attendance/check-in`, `POST /attendance/check-out`,
  `GET /attendance/me?range=daily|weekly|monthly`, `GET /attendance` (admin, with
  `date`/`departmentId`/`status`/`cursor`), `GET /attendance/summary` all live
  (**:8000**, `/api/v1`).
- S07 is `DONE`: `POST /leaves`, `GET /leaves/me`, `GET /leaves` (admin),
  `PATCH /leaves/:id/approve`, `PATCH /leaves/:id/reject` (`{ reason }`),
  `GET /leaves/balance/me` all live. Leave types + balances per ADR-004; approve/reject
  verbs per ADR-006.
- `@dayflow/shared` exports the attendance/leave types + the apply-leave Zod schema.
  If a needed schema is missing, add it to shared and note it loudly in your log +
  `STATE.md`.
- **S09 is optional here.** Check `STATE.md`: if S09 is `DONE`, subscribe to
  `GET /api/v1/events` (SSE, ADR-009) for live leave-status updates; if not, the pages
  must still work fully via refresh. Do not block on S09.
- You are on latest `main`; `npm install` works; api + web run (`npm run dev`).

## Deliverables (exact files)
### Attendance (PAGE 7)
- `apps/web/app/(app)/attendance/page.tsx` — top section (today's date prominent,
  large Check-In/Check-Out button — green to check in, red to check out — current
  status line, hours-worked progress bar), the Daily/Weekly/Monthly view toggle, the
  active view, and the summary stats bar. Check-in calls
  `POST /attendance/check-in` (send `location`; `ipAddress` inferred server-side),
  check-out calls `POST /attendance/check-out`; both refresh the view.
- `apps/web/app/(app)/attendance/_components/attendance-calendar.tsx` — **Monthly
  default**: month grid, each day cell shows day number, a color-coded status dot
  (Green=PRESENT, Red=ABSENT, Yellow=HALF_DAY, Blue=ON_LEAVE per ADR-005) and
  check-in/out times; legend at bottom. Data from `GET /attendance/me?range=monthly`.
- `apps/web/app/(app)/attendance/_components/attendance-weekly.tsx` — Weekly table
  (Day | Date | Check In | Check Out | Hours Worked | Status) + totals row, from
  `range=weekly`.
- `apps/web/app/(app)/attendance/_components/attendance-list.tsx` — **day-wise list
  view (ADR-019)** defaulting to the **current month**, with the board columns:
  **Date | Check In | Check Out | Work Hours | Extra Hours | Break**
  (`extraHours` + `breakMinutes` from the attendance rows). Data from
  `GET /attendance/me?range=monthly`.
- `apps/web/app/(app)/attendance/_components/attendance-summary.tsx` — stats bar
  (Present / Absent / Half-days / Leaves / Total Hours).
- `apps/web/app/(app)/attendance/_components/admin-attendance-table.tsx` —
  **ADMIN/HR only**: employee-selector dropdown + all-employees table (Employee |
  Today Status | Check In | Check Out | Hours | Actions) from `GET /attendance`, with
  a **CSV export** button (differentiator #5) that downloads the current filtered view
  as `attendance.csv` (client-side CSV from fetched rows).

### Leave Management (PAGE 8)
- `apps/web/app/(app)/leaves/page.tsx` — balance cards row (Paid blue, Sick orange,
  Casual green — each a ProgressBar; Unpaid = "Unlimited" gray, per ADR-004) from
  `GET /leaves/balance/me`, an "Apply for Leave" button, and the history table below.
- `apps/web/app/(app)/leaves/_components/apply-leave-modal.tsx` — modal/slide-over:
  Leave Type (Paid/Sick/Casual/Unpaid), Start Date, End Date, **auto-calculated Total
  Days** (read-only; skip weekends to match the server's working-day count,
  differentiator #4), Reason textarea, and an **attachment upload** (ADR-018) for a
  sick-leave certificate — sends `attachmentUrl`/multipart file per S07. **Zod-validate**
  with the shared apply-leave schema before submit → `POST /leaves`; on success close,
  toast, and refresh balances + history.
- `apps/web/app/(app)/leaves/_components/leave-history-table.tsx` — columns:
  Leave Type (colored badge) | From | To | Days | Reason | Status | Applied On;
  status badges Pending=yellow, Approved=green ✓, Rejected=red ✕; **row expands** to
  show the reviewer comment; Status + Year filters + pagination. From `GET /leaves/me`.

### Leave Approvals — Admin (PAGE 9)
- `apps/web/app/(app)/leaves/approvals/page.tsx` — **ADMIN/HR only**: stats bar
  (Pending / Approved this month / Rejected this month), filter/sort bar (Status /
  Department / Leave Type; sort by Date Applied / Employee Name), and the request
  cards. From `GET /leaves` (default `status=PENDING`).
- `apps/web/app/(app)/leaves/approvals/_components/leave-request-card.tsx` —
  card layout (not a table): employee avatar + name + department, leave-type badge,
  date range "(N days)", expandable reason, applied-on, the employee's current leave
  balance as small text, and **Approve (green) / Reject (red)** actions. A comment
  textarea appears on action; Approve → `PATCH /leaves/:id/approve` (optional notes),
  Reject → `PATCH /leaves/:id/reject` with `{ reason }` (required, min length per the
  schema). On success remove the card + toast.
- `apps/web/app/(app)/leaves/approvals/_components/empty-state.tsx` — the "All caught
  up! No pending leave requests." illustration state (reuse S10 EmptyState).
- `apps/web/app/(app)/leaves/approvals/_components/allocation-modal.tsx` — **ADMIN/HR
  allocation UI (ADR-018)**: allocate leave balances to employees (e.g. Paid / Sick
  days) via a modal — pick employee + leave type + number of days →
  `POST /leaves/allocations`; on success toast and refresh. Surfaced from an
  "Allocate Leave" button on the approvals page (ADMIN/HR only).

### Shared helper
- `apps/web/lib/attendance.ts` and `apps/web/lib/leaves.ts` *(or extend S10's api
  layer)* — typed fetchers for every endpoint above + a small `toCsv()` util for the
  export, using `@dayflow/shared` types. No `any`.
- `apps/web/lib/realtime.ts` *(only if S09 is DONE)* — thin SSE subscriber hook over
  `GET /api/v1/events`; if S09 is not done, skip this file and note it.

## Implementation notes
- **Role gates (ADR-001).** `/leaves/approvals` and the admin attendance table are
  ADMIN/HR only — enforce at the route (redirect employees to `/dashboard`) and hide
  the nav item; the API remains the final gate.
- **Status ↔ color (ADR-005).** PRESENT green, ABSENT red, HALF_DAY yellow, ON_LEAVE
  blue — consistent across calendar, weekly table, and legend. Leave label "Leave" ⇒
  `ON_LEAVE`.
- **Approve/reject (ADR-006).** Two verbs; reject requires `{ reason }`. The server
  decrements the balance + sets reviewer fields in one transaction — the UI just
  reflects the returned state and refreshes balances.
- **Live reflection (differentiator #1 / ADR-009).** If S09 is present, subscribe to
  SSE so an admin approval updates the employee's history/balance without a manual
  refresh, and a new pending request appears on the approvals page live. If S09 is
  absent, everything must still work on refresh — never make SSE a hard dependency.
- **Working-day count (differentiator #4).** The modal's auto Total Days skips
  weekends so it matches the server; treat the server's count as authoritative on the
  response.
- **CSV export (differentiator #5).** Client-side generation from the fetched admin
  rows is fine for the MVP; filename `attendance.csv`. (Payroll CSV is S15.)
- **Envelope + errors (ADR-010).** All responses `{ success, data, meta? }`; cursor
  pagination on lists; surface `error.message` via toast; include basic loading/empty
  states (skeleton polish is S16).
- Reuse S10 components and follow `plan.md §6` (strict TS, no `any`, JSDoc, file/naming
  conventions). Stay in scope: only the attendance + leaves trees + their api helpers.

## Acceptance criteria
Run and confirm each (web **:3000**, api **:8000**; seed creds — Employee
`john@dayflow.com`/`Employee@123`, Admin `admin@dayflow.com`/`Admin@123`):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Check in/out:** as the employee, the button checks in (calls
      `POST /attendance/check-in`), status flips to "Checked in at …", and the calendar
      cell for today reflects the status; check-out updates hours.
- [ ] **Views:** Daily/Weekly/Monthly toggle each render real data; calendar dots and
      the legend match ADR-005 colors; the summary bar totals are correct.
- [ ] **Attendance list (ADR-019):** the day-wise list defaults to the current month
      and shows Date / Check In / Check Out / Work Hours / Extra Hours / Break columns.
- [ ] **Admin attendance:** as admin, the all-employees table loads from
      `GET /attendance`, the employee selector filters it, and CSV export downloads a
      file with the visible rows.
- [ ] **Apply leave:** the modal auto-calculates Total Days (weekends skipped),
      Zod-validates, supports a **sick-leave attachment upload** (ADR-018), and a valid
      submit creates a **PENDING** request that appears in the employee's history.
- [ ] **Allocation (admin, ADR-018):** as admin, the allocation UI allocates Paid/Sick
      days to an employee via `POST /leaves/allocations` and the target employee's
      balance reflects the new allocation.
- [ ] **Approve/reject:** as admin on `/leaves/approvals`, approving moves the request
      out of pending; rejecting requires a comment; both reflect in the employee's
      history and the employee's balance updates after approval (live if S09 present,
      else on refresh).
- [ ] **Expandable comment:** an approved/rejected row in the employee history expands
      to show the reviewer comment.
- [ ] **Role gates:** as the employee, `/leaves/approvals` redirects to `/dashboard`
      and the nav item is hidden; the admin attendance table is not shown to employees.
- [ ] Scope check: only files under `apps/web/app/(app)/attendance/**`,
      `apps/web/app/(app)/leaves/**`, and the attendance/leaves api helpers (+ optional
      realtime helper if S09 done) were touched (plus shared schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S14 → `DONE`; under "Interfaces produced (detail)" note the
  routes added (`/attendance`, `/leaves`, `/leaves/approvals`), the api helpers, the
  CSV export util, whether SSE was wired (and how), and any shared schema you added.
- `build/logs/S14-log.md`: from `_TEMPLATE.md` — record the working-day counting rule,
  the SSE decision (present/absent), and any deviation from ADR-004/005/006/009.

## ▶ Copy-paste prompt
```
You are running build session S14 (Attendance & Leave pages) for the Dayflow HRMS
monorepo. This is a fresh chat with no prior memory — all context lives in committed
files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S14-attendance-leave-pages.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md PAGE 7–9 and docs/API.md §3 + §4, plus ADR-001, 004, 005,
   006, 009, 010, 018, 019.
2. Verify the preconditions (S10 DONE — web foundation; S06 DONE — attendance API;
   S07 DONE — leave API). Check whether S09 (SSE) is DONE and plan accordingly (live
   if present, refresh otherwise). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s14-attendance-leave, build
   ONLY the Deliverables listed in the session file, run every Acceptance criteria
   check and confirm it passes, then update build/STATE.md and write
   build/logs/S14-log.md, and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked, and the next session
   to run.

Stay strictly in scope — the /attendance, /leaves, and /leaves/approvals pages only;
reuse S10's design system and app shell; make no API changes; do not hard-depend on
S09. Follow docs/UI_DESIGN_PROMPT.md precisely. When the spec is ambiguous, follow
docs/DECISIONS.md. Begin.
```

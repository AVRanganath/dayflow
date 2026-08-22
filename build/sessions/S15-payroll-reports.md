# S15 — Payroll Pages & Reports/Export

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S15-log.md` and commit before you finish.

- **Owns:** `apps/web/app/(app)/payroll/*` and the payroll/attendance CSV report
  export surfaced there (PAGE 10 in `docs/UI_DESIGN_PROMPT.md`). **Produces:** the
  employee read-only INR payroll page with payslip download and 12-month history, the
  admin bulk-payroll view with salary-structure editing + process action, and CSV
  export (differentiator #5).
- **Depends on:** S10 (web foundation: Next scaffold, design system, `apiClient`,
  auth/session context, shared UI components, app shell) and S08 (payroll API: view,
  admin update, payslip PDF). **Parallel with:** S11, S12, S13, S14 (disjoint files).

## Goal
Build the payroll page against the real API per `docs/UI_DESIGN_PROMPT.md` PAGE 10.
Employees see a read-only INR salary breakdown, download a real payslip PDF, and view
12 months of history. Admins/HR select an employee, view a bulk payroll table, edit a
salary structure (ADMIN-only) with the net recomputing, run process-payroll, and
export CSV. Reuse S10's shell and components; no API changes. All amounts in INR
(ADR-008).

## Preconditions
- S10 is `DONE` (Next 14 App Router on **:3000**, Tailwind design tokens, `apiClient`
  with auth/refresh, auth/session context exposing current user + role, and shared
  components: Sidebar, Header, DataTable, StatusBadge, Modal, Avatar, EmptyState,
  Toast, form fields). If missing, stop and report.
- S08 is `DONE`: `GET /payroll/me`, `GET /payroll` (admin, `month`/`year`/`cursor`),
  `GET /payroll/:employeeId` (admin, salary structure),
  `PUT /payroll/:employeeId/salary-structure` (**ADMIN-only** wage/structure update,
  ADR-013), and payslip PDF download (`GET /payroll/:id/payslip`) all live (**:8000**,
  `/api/v1`). If the process-payroll action isn't a distinct endpoint in S08, wire the
  button to whatever S08 exposes (or disable it and note it); do **not** invent an
  endpoint.
- `@dayflow/shared` exports the payroll types + the salary-structure update Zod schema
  (monthly `wage`, per ADR-013). If missing, add it to shared and note it loudly in
  your log + `STATE.md`.
- You are on latest `main`; `npm install` works; api + web run (`npm run dev`).

## Deliverables (exact files)
### Employee view (PAGE 10)
- `apps/web/app/(app)/payroll/page.tsx` — loads `GET /payroll/me`; renders the
  current-month salary card + breakdown + history for employees, and the admin
  surface (below) for ADMIN/HR. Read-only for employees.
- `apps/web/app/(app)/payroll/_components/current-salary-card.tsx` — large prominent
  card: Month/Year, **Net Salary** big/bold in INR (ADR-008), status badge
  (Processed green / Pending yellow), and a **"Download Payslip"** button that fetches
  `GET /payroll/:id/payslip` and downloads the returned PDF (blob → object URL).
- `apps/web/app/(app)/payroll/_components/salary-breakdown.tsx` — two columns
  (ADR-013/014): Earnings (**Basic, HRA, Standard Allowance, Performance Bonus, LTA,
  Fixed Allowance** → **Gross** = Wage) and Deductions (**Provident Fund** — employee
  and employer shares; **Professional Tax** → **Total Deductions**; only the employee
  PF share reduces take-home), plus the **payable days** (working days − unpaid leave −
  missing days, ADR-014) and a highlighted **Net Salary** bar. All INR-formatted
  (ADR-008), all read-only for employees.
- `apps/web/app/(app)/payroll/_components/salary-history-table.tsx` — last 12 months:
  Month | Gross | Deductions | Net | Status | Payslip (download icon per row → the
  payslip PDF for that record).

### Admin view (PAGE 10 additional)
- `apps/web/app/(app)/payroll/_components/admin-payroll-table.tsx` — **ADMIN/HR
  only**: employee selector/search + bulk table (Employee | Department | Gross |
  Deductions | Net | Status | Actions) from `GET /payroll`, a **"Process Payroll"**
  action for the current month, and a CSV **Export** button (differentiator #5) that
  downloads the visible payroll rows as `payroll.csv`.
- `apps/web/app/(app)/payroll/_components/edit-salary-modal.tsx` — **ADMIN-only**
  (not HR — payroll edits are ADMIN-only per ADR-001): the **salary-structure editor**
  (ADR-013). Opens on an employee, loads `GET /payroll/:employeeId`, and lets the admin
  edit the **monthly Wage**. As the Wage changes, the components (Basic, HRA, Standard
  Allowance, Performance Bonus, LTA, Fixed Allowance; PF employee/employer, Professional
  Tax) **auto-recompute live** per the ADR-013 rules — Fixed Allowance is the balancer
  so **total components = Wage** is always enforced/previewed. Zod-validate (Wage
  positive), submit `PUT /payroll/:employeeId/salary-structure` (**ADMIN-only**), then
  refresh the table + toast. If the current user is HR (not ADMIN), the edit action is
  hidden/disabled.
- `apps/web/lib/payroll.ts` *(or extend S10's api layer)* — typed fetchers:
  `getMyPayroll()`, `listPayroll(params)`, `getEmployeePayroll(id)`,
  `updateSalaryStructure(id, { wage })` (→ `PUT /payroll/:employeeId/salary-structure`,
  ADMIN-only, ADR-013), `downloadPayslip(id)` (returns a blob), plus a `toCsv()`
  util (reuse S14's if present), using `@dayflow/shared` types. No `any`.

## Implementation notes
- **INR only (ADR-008).** Every amount is `₹` with thousands separators; ignore the
  `USD`/`Chase` samples in `docs/API.md §5`. Gross = sum(components) = Wage; Net =
  Gross − employee PF − Professional Tax, then **prorated by payable days** (ADR-014).
  The edit modal's live recompute uses the ADR-013 component rules (total = Wage) so
  the numbers the admin sees match what the server returns.
- **Role split (ADR-001).** Employees: fully read-only. HR: can view the admin table
  but **cannot edit salary** (payroll edits are ADMIN-only). ADMIN: full edit +
  process. Gate `/payroll`'s admin surface at the route/role level; the edit action is
  ADMIN-only. The API is the final gate — fail fast in the UI regardless.
- **Payslip download.** Fetch the PDF as a blob through `apiClient` (auth header),
  create an object URL, trigger download, revoke the URL. Do not open an unauthorized
  raw link.
- **CSV export (differentiator #5).** Client-side CSV from the fetched admin rows;
  filename `payroll.csv`. This is the payroll half of the reports/export differentiator
  (attendance CSV lives in S14).
- **Process payroll.** Wire the button to S08's process endpoint if one exists; if S08
  only supports per-employee updates, disable the button with a tooltip and record the
  gap in your log — do not fabricate an endpoint.
- **Envelope + errors (ADR-010).** All responses `{ success, data, meta? }`; cursor
  pagination on the admin list; surface `error.message` via toast; basic loading/empty
  states (skeleton polish is S16).
- Reuse S10 components; follow `plan.md §6` (strict TS, no `any`, JSDoc, file/naming
  conventions). Stay in scope: only the `payroll/` tree + its api helper.

## Acceptance criteria
Run and confirm each (web **:3000**, api **:8000**; seed creds — Employee
`john@dayflow.com`/`Employee@123`, Admin `admin@dayflow.com`/`Admin@123`):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Employee payroll:** as the employee, `/payroll` shows the current-month card
      (Net in INR, status badge), the ADR-013 component breakdown (Basic, HRA, Standard
      Allowance, Performance Bonus, LTA, Fixed Allowance; PF employee/employer,
      Professional Tax), the **payable days**, and the 12-month history — all read-only,
      all `₹`-formatted.
- [ ] **Payslip PDF (prorated, ADR-014):** "Download Payslip" (and the history row
      icons) download a real PDF via `GET /payroll/:id/payslip`; the payslip shows
      payable days (working days − unpaid leave − missing days) and the prorated net.
- [ ] **Admin edit (wage recompute, ADR-013):** as admin, opening an employee's
      salary-structure editor and changing the **monthly Wage** makes the components
      **auto-recompute live** (total = Wage, Fixed Allowance balances); submitting
      `PUT /payroll/:employeeId/salary-structure` persists and the bulk table recomputes
      to match.
- [ ] **CSV export:** the admin Export button downloads `payroll.csv` containing the
      visible rows.
- [ ] **Role checks:** the employee sees no edit/process controls and cannot reach the
      admin surface; an HR user can view the table but the salary-edit action is
      hidden/disabled (ADMIN-only).
- [ ] Scope check: only files under `apps/web/app/(app)/payroll/**` and the payroll
      api helper were touched (plus shared schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S15 → `DONE`; under "Interfaces produced (detail)" note the
  `/payroll` route + admin surface, the api helpers exported from `lib/payroll.ts`
  (incl. the blob payslip download + CSV util), the role split enforced, whether a
  process-payroll endpoint was available, and any shared schema you added.
- `build/logs/S15-log.md`: from `_TEMPLATE.md` — record the Net formula, the
  process-payroll decision, HR-vs-ADMIN edit gating, and any deviation from ADR-008.

## ▶ Copy-paste prompt
```
You are running build session S15 (Payroll pages & reports/export) for the Dayflow
HRMS monorepo. This is a fresh chat with no prior memory — all context lives in
committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S15-payroll-reports.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md PAGE 10 and docs/API.md §5, plus ADR-001, 008, 010, 013, 014.
2. Verify the preconditions (S10 DONE — web foundation; S08 DONE — payroll API incl.
   payslip PDF and ADMIN-only PUT /payroll/:employeeId). If anything blocks you, stop
   and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s15-payroll-reports, build
   ONLY the Deliverables listed in the session file, run every Acceptance criteria
   check and confirm it passes, then update build/STATE.md and write
   build/logs/S15-log.md, and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked, and the next session
   to run.

Stay strictly in scope — the /payroll page + CSV export only; reuse S10's design
system and app shell; make no API changes; all amounts INR (ADR-008); the salary-
structure editor edits the monthly Wage and is ADMIN-only, components auto-recompute
(ADR-013). Follow docs/UI_DESIGN_PROMPT.md precisely. When the spec is ambiguous,
follow docs/DECISIONS.md. Begin.
```

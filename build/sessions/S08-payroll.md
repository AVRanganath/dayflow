# S08 — Payroll Module

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S08-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/payroll/`. **Produces:** payroll read endpoints, an
  ADMIN-only **salary-structure** get/update built on the ADR-013 Wage-driven component
  engine, **attendance-driven payslip generation** (ADR-014, payable-days proration),
  and a downloadable payslip PDF (differentiator #5). All amounts INR.
- **Depends on:** S03 (API core, middleware, `requireRole`, envelope, error
  classes). **Parallel with:** S04–S07 (disjoint files — different module dirs).

## Goal
Implement the `/payroll` API from `docs/API.md §5`, **reworked per ADR-013/014.**
Employees read their own records read-only (the new component breakdown); ADMIN (only —
ADR-001) gets/updates a per-employee **SalaryStructure** driven by a monthly Wage,
where the component engine auto-computes earnings/deductions (ADR-013); payslip
generation prorates net by **payable days** (working days − unpaid leave − missing
attendance, ADR-014); and any employee can download a real payslip **PDF**
(differentiator #5). All money is INR (ADR-008).

## Preconditions
- S03 is `DONE` in `build/STATE.md` (Express app, `authenticate` + `requireRole`
  middleware, Zod-validate middleware, `AppError` subclasses, envelope helpers).
- S01 (`SalaryStructure` + reworked `PayrollRecord` tables + seeded records) and S02
  (shared `SalaryStructureSchema`) are `DONE`; `npm install`, `npm run typecheck` pass
  on latest `main`.
- ADR-001: salary-structure **edits are ADMIN-only** (HR cannot edit salary). ADR-008: INR.
- ADR-013 (component engine) + ADR-014 (payable-days proration) are the authoritative
  payroll model; the old `conveyance/medical/special/incomeTax` columns are gone.

## Deliverables (exact files)
- `apps/api/src/modules/payroll/payroll.routes.ts` — mounts under `/api/v1/payroll`:
  `GET /me`, `GET /`, `GET /:employeeId/salary-structure`,
  `PUT /:employeeId/salary-structure` (ADMIN-only), `GET /:id/payslip`.
  Auth + RBAC + Zod-validate middleware wired per endpoint (see route-order note).
- `apps/api/src/modules/payroll/payroll.controller.ts` — thin controllers; parse
  request, call service, return envelope (or stream the PDF). No Prisma here.
- `apps/api/src/modules/payroll/payroll.service.ts` — business logic: fetch records,
  recompute totals on update, build the payslip data model.
- `apps/api/src/modules/payroll/payroll.calc.ts` — pure, **unit-tested** salary math:
  `computeSalary(wage, cfg)` (ADR-013 component engine → earnings + deductions + gross
  + monthly net) and `prorateByPayableDays(monthlyNet, payableDays, workingDays)`
  (ADR-014). Reused by the salary-structure update, payslip generation, and (matching)
  the S01 seed.
- `apps/api/src/modules/payroll/payslip.pdf.ts` — renders a PayrollRecord to a PDF
  buffer/stream using a light lib (e.g. `pdfkit`). INR-formatted (₹, thousands sep).
- `apps/api/src/modules/payroll/payroll.schema.ts` — uses the Zod schemas from
  `@dayflow/shared` (`SalaryStructureSchema`, list-query schema). If a needed schema is
  missing, that is a **shared-contract change**: add it in `@dayflow/shared` and
  announce it in `STATE.md`/log (do not inline-define in the module).
- Register the router in the API's route index (minimal edit to the S03-owned
  `apps/api/src/app.ts` or `routes/index.ts`; record it in Step 6).
- Add `pdfkit` (+ `@types/pdfkit`) to `apps/api/package.json`.

## Endpoints (contract)
- `GET /api/v1/payroll/me` — **any auth role, read-only.** Caller's own payroll: the
  **new ADR-013 breakdown** (Wage, each earning component, deductions, gross, monthly
  net) + payslip history (newest first, with payable days). No write path.
- `GET /api/v1/payroll` — **ADMIN/HR** (ADR-001). Optional `?month=&year=` filter,
  cursor-paginated, includes employee name.
- `GET /api/v1/payroll/:employeeId/salary-structure` — **ADMIN-only** (ADR-013).
  Returns that employee's `SalaryStructure`: Wage + the computed components + deduction
  inputs. (Salary Info is Admin-only per the board note.)
- `PUT /api/v1/payroll/:employeeId/salary-structure` — **ADMIN-only** (ADR-001; HR
  gets `403`). Body = `{ wage }` (+ optional component/rate overrides,
  `SalaryStructureSchema`). Service runs `computeSalary(wage, cfg)` (never trusts
  client-sent component totals): Basic 50% of Wage, HRA 50% of Basic, Standard
  Allowance, Performance Bonus 8.33% of Basic, LTA 8.33% of Basic, **Fixed Allowance =
  Wage − sum(all above)**; deductions PF employee 12% of Basic (+ employer 12% for CTC
  only) and Professional Tax ₹200. Upserts the `SalaryStructure`. Audited (S09 hook).
  → `200`.
- `GET /api/v1/payroll/:id/payslip` — **owner or ADMIN/HR.** Generates the payslip from
  `SalaryStructure` + Attendance + LeaveRequest (**ADR-014 payable days**) and streams a
  **PDF** for the given `PayrollRecord` `id` (`Content-Type: application/pdf`). Row-level
  check: a non-admin may only download their own. Differentiator #5.

## Implementation notes
- **Layering (plan.md §6).** `route → controller → service → prisma`. No Prisma in
  controllers. Every input parsed with a `@dayflow/shared` Zod schema. Envelope +
  `AppError` from S03.
- **Salary math (`payroll.calc.ts`, pure — ADR-013).** `computeSalary(wage, cfg)`:
  Basic = 50% of Wage; HRA = 50% of Basic; Standard Allowance (fixed/configured);
  Performance Bonus = 8.33% of Basic; LTA = 8.33% of Basic; **Fixed Allowance = Wage −
  sum(all above)** (balancer, so gross = Wage). Deductions: PF employee = 12% of Basic
  **and** employer = 12% of Basic (employer share is CTC-only, not deducted from
  take-home); Professional Tax = ₹200. `monthlyNet = gross − employeePF −
  professionalTax`. Rates/percentages come from `cfg` (company settings, ADR-016).
  Use `Prisma.Decimal` (or a decimal helper) — do **not** do float math on money.
  Reject negative net (400).
- **Payable-days proration (ADR-014).** `payableDays = workingDaysInMonth −
  unpaidLeaveDays − missingAttendanceDays` (approved PAID/SICK leave still counts as
  payable; only `UNPAID` leave and unexcused absences reduce it); `net = round(monthlyNet
  × payableDays / workingDaysInMonth)`. `workingDaysInMonth` derives from the employee's
  `workingDaysPerWeek` (default 5) minus company holidays (holidays optional in MVP).
- **Read-only for `/me`.** No update route for self; salary changes flow only through
  the ADMIN `PUT /:employeeId/salary-structure`.
- **Route ordering.** `GET /:id/payslip` and `GET /:employeeId/salary-structure` share a
  `:param` segment — register the literal/more-specific patterns so `payslip` isn't
  shadowed (e.g. mount `/:id/payslip` before `/:employeeId/salary-structure`, or
  disambiguate by method/path).
- **Payslip PDF.** `pdfkit` streamed to the response; include company header, employee
  name/id, month/year, the ADR-013 component line items, gross, deductions, **payable
  days / working days**, and net — all INR-formatted (₹, thousands separators, ADR-008).
  Keep the layout simple and deterministic. Ignore the `USD`/`base`/`allowances` sample
  shapes in `API.md` — the `SalaryStructure` + reworked `PayrollRecord` columns are
  authoritative.
- **S09 audit hook (do NOT implement audit here).** After a successful salary update,
  call a no-op-safe hook, e.g. `auditPayrollUpdate({ actorUserId, employeeId,
  oldValues, newValues })`, exported from this module (or a tiny local stub) with a
  `// TODO(S09): write AuditLog + notify` comment. S09 wires the real AuditLog write;
  do not add audit-table writes in this session.

## Acceptance criteria
Run and confirm each (api running locally, admin + HR + employee tokens from seed):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **`computeSalary` unit test (ADR-013).** At Wage ₹50,000: Basic 25,000, HRA
      12,500, Performance Bonus 2,082.50, LTA 2,082.50, Standard Allowance per config,
      **Fixed Allowance = 50,000 − sum(others)**, gross = Wage = 50,000; employee PF
      3,000 (12% of Basic), Professional Tax 200 → `monthlyNet` = 50,000 − 3,000 − 200
      = 46,800 (before proration).
- [ ] `GET /payroll/me` returns the caller's **component breakdown** and exposes no
      write path:
      ```bash
      curl -s localhost:8000/api/v1/payroll/me -H "Authorization: Bearer $EMP"
      ```
- [ ] ADMIN salary-structure update recomputes the components (client-sent totals are
      ignored — only `wage`/config drive it):
      ```bash
      curl -s -X PUT localhost:8000/api/v1/payroll/$EMP_EMPLOYEE_ID/salary-structure \
        -H "Authorization: Bearer $ADM" -H 'Content-Type: application/json' \
        -d '{"wage":50000}'
      # → Basic 25000, HRA 12500, gross 50000, employeePF 3000, professionalTax 200
      ```
- [ ] **Payable-days proration (ADR-014).** For an employee with unpaid-leave/missing
      days, the generated payslip's net = `round(monthlyNet × payableDays /
      workingDays)` (full attendance → full `monthlyNet`); the payslip lists payable
      days vs working days.
- [ ] An employee (or HR) calling `PUT /payroll/:employeeId/salary-structure` gets
      `403` (ADR-001; salary edits ADMIN-only).
- [ ] Payslip endpoint returns a PDF:
      ```bash
      curl -s -D - -o payslip.pdf localhost:8000/api/v1/payroll/$RECORD_ID/payslip \
        -H "Authorization: Bearer $EMP"
      file payslip.pdf   # → PDF document; response Content-Type: application/pdf
      ```
- [ ] A non-admin requesting someone else's payslip `id` gets `403`.

## On completion (Step 6)
- `build/STATE.md`: set S08 → `DONE`; under "Interfaces produced (detail)" list the
  five `/payroll` routes (incl. `/:employeeId/salary-structure`), the ADR-013
  `computeSalary` component rules + ADR-014 payable-days proration formula, the payslip
  PDF content-type, the exported `auditPayrollUpdate` hook signature (so S09 can wire
  it), and the `pdfkit` dependency added. Flag any `@dayflow/shared` schema you added as
  a shared-contract change under "Blockers/notes".
- `build/logs/S08-log.md`: from `_TEMPLATE.md` — record the decimal-money approach,
  route-ordering gotcha, PDF lib choice, and exactly where the S09 audit hook lives.

## ▶ Copy-paste prompt
```
You are running build session S08 (Payroll Module) for the Dayflow HRMS monorepo.
This is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S08-payroll.md (your full spec). Also read docs/API.md §5 and
   docs/DECISIONS.md ADR-001/008/010 and especially ADR-013 (Wage-driven salary
   component engine) + ADR-014 (attendance-driven, payable-days payslip).
2. Verify the preconditions (S01, S02, S03 are DONE). If anything blocks you, stop and
   tell me.
3. Follow the Session Protocol's seven steps: branch feat/s08-payroll, build ONLY the
   Deliverables in the session file (apps/api/src/modules/payroll/*, the pdfkit dep,
   plus the minimal route-index registration), run every Acceptance criteria command
   and confirm it passes, then update build/STATE.md and write build/logs/S08-log.md,
   and commit using Conventional Commits (no AI co-author line).
4. Implement exactly: /me read-only (new component breakdown); ADMIN-only PUT
   /:employeeId/salary-structure that runs the pure unit-tested computeSalary(wage,cfg)
   engine (ADR-013: Basic 50%, HRA 50% of basic, Perf Bonus/LTA 8.33% of basic, Fixed
   Allowance balances to Wage; PF 12% of basic each side, Prof. Tax ₹200) — never trust
   client totals, use Decimal; payslip net prorated by payable days (ADR-014: working
   days − unpaid leave − missing days); a real payslip PDF (pdfkit, INR-formatted) with
   a row-level ownership check. Leave a clearly-marked S09 audit hook — do NOT write
   AuditLog rows here.
5. Finish with a handoff summary: what's done, what's unblocked (S09, S15), and the
   next session to run.

Stay strictly in scope — only the payroll module. Amounts are INR (ADR-008); the
Prisma SalaryStructure + reworked PayrollRecord columns are authoritative over API.md's
USD sample. When the spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

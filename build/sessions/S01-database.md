# S01 — Database: Schema, Migrations & Seed

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S01-log.md` and commit before you finish.

- **Owns:** `packages/db` (Prisma schema finalize, migrations, seed). **Produces:** an
  applied initial migration, a rich idempotent seed, `db:*` scripts, and a shared
  `@dayflow/db` Prisma client that `apps/api` imports.
- **Depends on:** S00. **Unblocks:** S03 (runs in parallel with S02).

## Goal
Finalize the Prisma schema per the ADRs, cut the first migration, and produce a
**rich demo dataset** (~30 employees, months of history) so every later module and
the demo look like a live company. Ship a shared Prisma client from `@dayflow/db`.

## Preconditions
- S00 is `DONE` in `build/STATE.md`; `packages/db` exists with a `package.json`,
  `tsconfig.json`, and `prisma/schema.prisma` (the initial, pre-ADR schema).
- Postgres is up: `docker compose up -d` and `docker compose ps` shows it healthy.
- `DATABASE_URL` resolves to `postgresql://postgres:postgres@localhost:5432/dayflow?schema=public`.
- You are on latest `main`.

## Deliverables (exact files)
- `packages/db/prisma/schema.prisma` — finalize to the **FINAL ADR-012..019 schema**
  (as recorded in `docs/DATABASE.md`):
  - **ADR-001:** add `HR` to the `Role` enum → `{ ADMIN, HR, EMPLOYEE }`.
  - **ADR-004:** keep `LeaveType = { PAID, SICK, UNPAID, CASUAL, MATERNITY, PATERNITY }`
    (already correct — confirm, don't reorder needlessly).
  - **ADR-016:** new **`Company`** model (`id, name, logoUrl?, loginIdPrefix @default("OI"),
    settings Json`) with `Employee.companyId` FK. MVP single-company.
  - **ADR-012:** `User` gains `loginId` (unique) and `mustChangePassword` (`@default(true)`).
  - **ADR-015:** expanded `Employee` — `personalEmail?`, `maritalStatus` (enum
    `MaritalStatus = { SINGLE, MARRIED, OTHER }`), `nationality?`, `panNumber?`,
    `uanNumber?`, `employeeCode?`, `workingDaysPerWeek Int @default(5)`, bank details
    (`bankAccountNumber?`, `bankName?`, `bankIfsc?`), a **self-relation `managerId`**
    (`Employee?` reporting manager + reverse `reports` relation), and optional Resume
    fields (`about?`, `whatILove?`, `hobbies?`, `skills` Json?, `certifications?`). All
    new fields nullable/defaulted so the migration is additive.
  - **ADR-013:** new **`SalaryStructure`** model — per-employee, driven by a monthly
    `Decimal wage`, storing the earning components (Basic, HRA, Standard Allowance,
    Performance Bonus, LTA, Fixed Allowance) and deduction inputs (employee/employer PF,
    professional tax) as `Decimal` (INR, ADR-008). One-to-one/latest per `employeeId`.
  - **ADR-014:** rework `PayrollRecord` — replace the old
    `conveyance/medical/special/incomeTax` columns with the attendance-driven snapshot
    (earnings, deductions, `payableDays`, `workingDays`, `grossSalary`,
    `totalDeductions`, `netSalary`), keyed unique on `[employeeId, month, year]`.
  - **ADR-018:** add `attachmentUrl?` to `LeaveRequest`.
  - **ADR-019:** add `breakMinutes @default(0)` and `extraHours` to `Attendance`.
- `packages/db/prisma/migrations/**` — the initial migration created via
  `npx prisma migrate dev --name init` (commit the generated SQL + `migration_lock.toml`).
- `packages/db/prisma/seed.ts` — the **rich, idempotent** demo seed (see notes).
- `packages/db/src/index.ts` (or `packages/db/index.ts` — match the `package.json`
  `main`/`exports` from S00) — instantiate and export a **single shared** `PrismaClient`
  (`export const prisma`) plus a `export * from '@prisma/client'` re-export of types/enums
  so `apps/api` imports everything from `@dayflow/db`.
- `packages/db/package.json` — wire scripts: `db:generate` → `prisma generate`,
  `db:migrate` → `prisma migrate dev`, `db:seed` → `tsx prisma/seed.ts`, and a
  `prisma.seed` key pointing at the seed so `prisma db seed` works. Confirm the root
  `db:*` proxies (from S00) reach these.

## Implementation notes
- **Passwords:** hash with `bcrypt` (cost 10+). Never store plaintext.
- **Demo credentials (must exist):** `admin@dayflow.com` / `Admin@123` with role
  `ADMIN`, and `john@dayflow.com` / `Employee@123` with role `EMPLOYEE`. Both get a
  linked `Employee` row.
- **ADR-003:** all dev users seeded with `isEmailVerified=true` so login works instantly.
- **Idempotent:** re-running `db:seed` must not duplicate rows or throw. Use
  deterministic keys (`upsert` on `email` / `employeeId` / the unique composites) and
  a stable RNG seed so history is reproducible.
- **ADR-008:** all payroll amounts are **INR** — use realistic Indian salary bands
  (e.g. basic ₹30k–₹90k) and keep the Decimal columns consistent with the schema.
- **Rich dataset (target the roadmap §2.8 "Rich demo seed"):**
  - **One `Company` (ADR-016):** name `"Odoo India"`, `loginIdPrefix "OI"`, a `settings`
    JSON carrying the ADR-013 defaults (PF employee/employer 12%, professional tax ₹200,
    component %s, `workingDaysPerWeek` 5). All employees `companyId` → this row.
  - ~5 `Department` rows (e.g. Engineering, Product, Sales, HR, Finance).
  - ~30 `Employee` rows spread across those departments; mix of `Gender`,
    `EmploymentType`, `designation`, join dates spanning a couple of years. A few
    users get role `HR`; most `EMPLOYEE`; the seeded admin is `ADMIN`. Populate the
    expanded ADR-015 profile fields (PAN/UAN, bank, marital status, nationality,
    `workingDaysPerWeek`) with realistic values, and wire **`managerId`** so most
    employees report to a manager (a few managers/leads report to none).
  - **loginId (ADR-012):** generate each user's `loginId` via the
    `OI`+first-two-of-first+first-two-of-last+join-year+4-digit-serial rule
    (e.g. `OIJODO20220001`), using the company prefix and a per-year serial counter;
    seed `mustChangePassword=false` for demo users so login works instantly.
  - **SalaryStructure (ADR-013):** one row per employee from a realistic monthly Wage
    (INR band), with the Wage-based components computed by the same rules S08 uses
    (Basic 50%, HRA 50% of Basic, Performance Bonus/LTA 8.33% of Basic, Standard
    Allowance, Fixed Allowance = Wage − sum), plus PF/professional-tax deduction inputs.
  - **Attendance:** several months of daily rows per employee, weekdays only, realistic
    `checkIn`/`checkOut`/`hoursWorked`, a believable mix of `PRESENT`/`ABSENT`/
    `HALF_DAY`/`ON_LEAVE`. Respect the `[employeeId, date]` unique constraint.
  - **LeaveRequest:** history across **all** statuses (`PENDING`, `APPROVED`,
    `REJECTED`) and multiple `LeaveType`s, with `reviewedById`/`reviewedAt`/
    `reviewerComment` set on decided rows, `totalDays` computed over working days.
  - **LeaveBalance:** rows for **`PAID`, `SICK`, `CASUAL`** (ADR-004) for the current
    `year` per employee, with `totalAllowed` and a `used` that reflects approved leaves.
  - **PayrollRecord (ADR-014):** a few months of history per employee in INR, statuses
    across `DRAFT`/`PROCESSED`/`PAID`, computed as **attendance-driven snapshots** —
    net prorated by payable days (`workingDays − unpaid leave − missing attendance`) off
    the employee's `SalaryStructure`, with `grossSalary`/`totalDeductions`/`netSalary`
    and `payableDays`/`workingDays` internally consistent; respect the
    `[employeeId, month, year]` unique constraint.
  - **AuditLog:** a handful of rows (e.g. salary edit, leave approval, role change)
    tied to the admin user, to exercise the audit-trail UI.
- Do **not** add app/feature code, no controllers/services — schema, migration, seed,
  client export only.

## Acceptance criteria
Run and confirm each:
- [ ] `npx prisma validate --schema packages/db/prisma/schema.prisma` passes.
- [ ] `npm run db:migrate` applies the `init` migration cleanly against Postgres on `5432`.
- [ ] `npm run db:generate` regenerates the client with no errors.
- [ ] `npm run db:seed` populates the DB and **is idempotent** (run it twice — second
      run succeeds, no duplicate-key errors, counts stable).
- [ ] `npx prisma studio --schema packages/db/prisma/schema.prisma` shows ~30
      employees across ~5 departments with attendance/leave/payroll/audit history.
- [ ] Demo creds exist: a `User` `admin@dayflow.com` (role `ADMIN`) and
      `john@dayflow.com` (role `EMPLOYEE`), both `isEmailVerified=true`, each with a
      linked `Employee`.
- [ ] **Company seeded (ADR-016):** exactly one `Company` `"Odoo India"` with
      `loginIdPrefix "OI"`; every `Employee.companyId` points at it.
- [ ] **loginIds well-formed (ADR-012):** every `User.loginId` is unique and matches
      the `OI` + 4 letters + 4-digit year + 4-digit serial pattern (e.g. `OIJODO20220001`).
- [ ] **Salary structures present (ADR-013):** each employee has a `SalaryStructure`
      whose earning components sum to its Wage (Fixed Allowance balances), and each
      seeded `PayrollRecord` net reflects payable-days proration (ADR-014).
- [ ] `import { prisma } from '@dayflow/db'` resolves (quick scratch `tsx` check).
- [ ] No feature/business code was added (scope check).

## On completion (Step 6)
- `build/STATE.md`: set S01 → `DONE`; under "Interfaces produced (detail)" record the
  migration name (`init`), the `@dayflow/db` export surface (`prisma` client +
  re-exported enums/types), the `db:generate`/`db:migrate`/`db:seed` scripts, and the
  demo credentials. Note S03 is unblocked (S02 may run in parallel).
- `build/logs/S01-log.md`: from `_TEMPLATE.md` — record the ADR-001 enum change, seed
  volume/shape, any Decimal/date gotchas, and how idempotency is guaranteed.

## ▶ Copy-paste prompt
```
You are running build session S01 (Database: Schema, Migrations & Seed) for the
Dayflow HRMS monorepo. This is a fresh chat with no prior memory — all context lives
in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S01-database.md (your full spec). Also read docs/DECISIONS.md
   (especially ADR-001/004/008 and the FINAL-schema decisions ADR-012..019),
   docs/DATABASE.md, and packages/db/prisma/schema.prisma.
2. Verify the preconditions (S00 DONE, Postgres healthy on 5432, DATABASE_URL set).
   If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s01-database, build ONLY
   the Deliverables listed in the session file, run every Acceptance criteria command
   and confirm it passes, then update build/STATE.md and write build/logs/S01-log.md,
   and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S03, and S02 in
   parallel), and the next session to run.

Stay strictly in scope — schema, migration, seed, and the @dayflow/db client only, no
feature code. When the spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

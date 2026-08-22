# Dayflow — Build State Ledger

> **This file is the single source of truth for build progress.** Every session
> reads it at the start (Step 1) and updates it at the end (Step 6). See
> `build/SESSION_PROTOCOL.md`. Keep entries terse and factual. When you finish a
> session, set its **Status** to `DONE` and fill its **Interfaces produced** so the
> next agent knows what now exists without reading all the code.

**Status legend:** `TODO` (not started) · `WIP` (in progress — put your branch name)
· `DONE` (merged, acceptance criteria pass) · `BLOCKED` (see Blockers/notes).

Last updated: _initial scaffold_ · by: _setup_

---

## Progress board

> **Owners are pre-assigned below** — that is your claim. When you actually start a
> session, flip its Status → `WIP` and fill **Branch** on your feature branch, and give
> the team a heads-up. Everything reaches `main` **only via a reviewed PR** from a
> `feat/sNN-<slug>` branch — never commit or merge to `main` directly.

Owner is the **assigned** person (below); set Status → `WIP` when you actually start.

| # | Session | Status | Owner | Branch | Depends on | Interfaces produced (fill on DONE) |
|---|---------|--------|-------|--------|-----------|------------------------------------|
| S00 | Bootstrap & tooling | DONE | Chandan | feat/s00-bootstrap | — | npm workspaces + turbo, shared config, docker-compose, `.env.example` |
| S01 | Database (Prisma) | TODO | Ranganath | — | S00 | migration name, seed cmd, demo creds |
| S02 | Shared package | DONE | Chandan | feat/s02-shared | S00 | Zod schemas + `z.infer` types + enums/routes/envelope (see detail) |
| S03 | API core | TODO | Ranganath | — | S01, S02 | app bootstrap, middleware, `AppError`, `/health` |
| S04 | Auth module | TODO | Chandan | — | S03 | auth endpoints, `requireAuth`/`requireRole`, token shape |
| S05 | Employee & department | TODO | Ranganath | — | S03 | employee/department/company endpoints, loginId helper |
| S06 | Attendance module | TODO | Chandan | — | S03 | attendance endpoints, `workStatus` helper |
| S07 | Leave module | TODO | Ranganath | — | S03 | leave endpoints, balance logic, allocations |
| S08 | Payroll module | TODO | Chandan | — | S03 | payroll endpoints, salary engine, payslip PDF |
| S09 | Realtime + notifications + audit | TODO | Ranganath | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | TODO | Pramith | — | S02 | api client, auth context, layout, design tokens |
| S11 | Auth pages | TODO | Pramith | — | S10, S04 | `/signin`, onboarding, change-password |
| S12 | Dashboards + analytics | TODO | Mukunda | — | S10, S06–S08 | `/dashboard` (both roles), charts |
| S13 | Profile + directory | TODO | Pramith | — | S10, S05 | `/profile`, `/employees` |
| S14 | Attendance + leave pages | TODO | Mukunda | — | S10, S06, S07 | `/attendance`, `/leaves`, approvals |
| S15 | Payroll pages + reports | TODO | Mukunda | — | S10, S08 | `/payroll`, export |
| S16 | Polish, tests, prod, demo | TODO | all four | — | all | Dockerfiles, tests, README, demo script |

### Assignment & order (who does what, and the gate to start)
- **Chandan** (backend): S00 → S02 → S04 → S06 → S08. *Runs S00 first, alone — everyone waits on it.*
- **Ranganath** (backend): S01 → S03 → S05 → S07 → S09. *S09 is last (needs all of S04–S08).*
- **Pramith** (frontend): S10 → S11 → S13. *S10 unlocks all frontend.*
- **Mukunda** (frontend): S14 → S15 → S12. *Starts once S06/S07 land; pairs on S10 meanwhile.*
- **All four**: S16 together at the end.

**Wave order:** ① Chandan S00 (solo) → ② Ranganath S01 + Chandan S02 (parallel) →
③ Ranganath S03 + Pramith S10 (parallel) → ④ backend fans out (Chandan S04/S06/S08,
Ranganath S05/S07) while frontend follows each module (Pramith S11→S13, Mukunda
S14→S15) → ⑤ Ranganath S09 + Mukunda S12 → ⑥ all four on S16.

---

## Interfaces produced (detail)

> As each session finishes, append a short block here so the next agent can code
> against real names without re-reading everything. Example format below.

<!--
### S03 — API core (DONE)
- App entry: `apps/api/src/server.ts`, exports nothing; run with `npm run dev -w apps/api`.
- Error envelope implemented in `apps/api/src/middleware/error.ts`; throw `AppError` subclasses from `apps/api/src/lib/errors.ts`.
- Base router mounted at `/api/v1`. Health: `GET /api/v1/health` → `{ success: true, data: { status: "ok" } }`.
- Auth middleware STUBS exist at `apps/api/src/middleware/auth.ts` — S04 fills them in.
-->

### S02 — Shared package `@dayflow/shared` (DONE)
Import everything from `@dayflow/shared`. Every type is `z.infer` from its schema —
never redefine. Files under `packages/shared/src/`:
- **`constants.ts`** — enum value arrays + `*Schema` (z.enum) + types for `Role`
  (ADMIN/HR/EMPLOYEE), `LeaveType`, `AttendanceStatus`, `LeaveStatus`, `PayrollStatus`,
  `Gender`, `MaritalStatus`, `EmploymentType`, `WorkStatus`. Plus `API_BASE` (`/api/v1`),
  `API_ROUTES` (all paths; param routes are builder fns, e.g. `API_ROUTES.leaves.approve(id)`),
  `DEFAULT_LIMIT=20`, `MAX_LIMIT=100`, `CURRENCY='INR'`.
- **`envelope.ts`** — `SuccessResponse<T>`, `ErrorResponse`, `ApiResponse<T>`,
  `ResponseMeta`, `ApiErrorBody` (types); `PaginationQuerySchema` (`cursor?`, coerced
  `limit`).
- **`auth.schema.ts`** — `SignupSchema` (ADR-012 onboarding: companyName/adminEmail/
  password/firstName/lastName), `SigninSchema` (`{ identifier, password }` — email OR
  loginId), `ChangePasswordSchema`, `RefreshSchema`, `ForgotPasswordSchema`,
  `ResetPasswordSchema`.
- **`employee.schema.ts`** — `UpdateProfileSchema` (strict self-editable subset),
  `AdminUpdateEmployeeSchema` (full ADR-015 fields), `CreateEmployeeSchema` (ADR-012 —
  no loginId/password; server-minted), `EmployeeListQuerySchema`.
- **`attendance.schema.ts`** — `CheckInSchema`, `CheckOutSchema` (breakMinutes),
  `AttendanceRangeSchema` (daily|weekly|monthly), `AttendanceListQuerySchema`.
- **`leave.schema.ts`** — `ApplyLeaveSchema` (+ `attachmentUrl`, end≥start refine),
  `RejectLeaveSchema`, `ApproveLeaveSchema`, `AllocateLeaveSchema` (ADR-018),
  `LeaveListQuerySchema`.
- **`payroll.schema.ts`** — `SalaryStructureSchema` (`{ wage, config? }`, ADR-013),
  `SalaryConfigSchema`, `PayrollListQuerySchema`.
- **`company.schema.ts`** — `UpdateCompanySchema`, `CompanySettingsSchema` (ADR-016).
- Build emits `dist/` (JS + `.d.ts`). Consumers may import from `@dayflow/shared`
  directly (exports resolve to `src` for tsx/next; `dist` for compiled output).
- **NOTE for S01:** the shared `Role` enum includes `HR`, but the Prisma enum on
  `main` still has only `ADMIN`/`EMPLOYEE`. **S01 must add `HR`** (ADR-001) so DB↔contract line up.
- `generateLoginId`/`computeSalary` pure helpers were **not** placed here — left to
  their owning modules (S05 auth/employee, S08 payroll) to keep shared dependency-free.

### S00 — Bootstrap & tooling (DONE)
- **Monorepo:** npm workspaces (`apps/*`, `packages/*`) + Turborepo. Root
  `packageManager: npm@11.17.0` (Turbo 2.10 requires it).
- **Root scripts:** `npm run dev|build|lint|typecheck|format|format:check` and
  `npm run db:generate|db:migrate|db:seed|db:studio` (proxy to `@dayflow/db`).
- **Workspaces present:** `@dayflow/api`, `@dayflow/web`, `@dayflow/shared`,
  `@dayflow/db`, `@dayflow/config`. Package names use `@dayflow/*`; internal deps use `*`.
- **Shared config (`@dayflow/config`):** `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`),
  `eslint.base.mjs` (flat config, typescript-eslint, `no-explicit-any: error`),
  `prettier.config.mjs`. Root `eslint.config.mjs` / `prettier.config.mjs` re-export these.
- **Skeletons:** `apps/api/src/index.ts`, `apps/web/src/index.ts`,
  `packages/shared/src/index.ts`, `packages/db/src/index.ts` are placeholders that
  compile — real code lands in S02/S03/S10 (each file names its session).
- **Infra:** `docker compose up -d` starts `postgres:16-alpine` (db `dayflow`,
  postgres/postgres, :5432) + `redis:7-alpine` (:6379), both with healthchecks.
- **Env:** `.env.example`, `apps/api/.env.example`, `apps/web/.env.local.example`
  (defaults match docker-compose). `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dayflow?schema=public`.
- **Verified:** `npm install`, `npm run typecheck`, `npm run lint`, `npm run format:check`
  all green. **`docker compose up -d` verified** — postgres + redis both report
  `healthy`; `pg_isready` OK and `redis-cli ping` → PONG.

---

## Blockers / notes (cross-session announcements)

> Put anything here that affects other agents: contract changes, schema changes,
> discovered gotchas, decisions that need recording in `docs/DECISIONS.md`.

- **✅ Docker set up via Colima** (`colima start`, Docker CLI + compose plugin). `docker
  compose up -d` verified: `dayflow-postgres` (:5432) and `dayflow-redis` (:6379) both
  `healthy`. Teammates on their own machines: install Docker Desktop *or* Colima
  (`brew install colima docker docker-compose && colima start`), then `docker compose
  up -d`. On Colima, `docker compose` needs `cliPluginsExtraDirs` in `~/.docker/config.json`
  (points to `/opt/homebrew/lib/docker/cli-plugins`).
- **Prisma pinned to v6** (ADR-020). `npm install` in this hardened env skipped
  postinstall scripts, so the Prisma client is **not generated yet** — S01 runs
  `npm run db:generate` (and `db:migrate`) as its first steps.
- **`.md` files are Prettier-ignored** (`.prettierignore`) — hand-aligned tables.
  Prettier governs code only; don't reformat the docs.

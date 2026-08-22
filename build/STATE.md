# Dayflow — Build State Ledger

> **This file is the single source of truth for build progress.** Every session
> reads it at the start (Step 1) and updates it at the end (Step 6). See
> `build/SESSION_PROTOCOL.md`. Keep entries terse and factual. When you finish a
> session, set its **Status** to `DONE` and fill its **Interfaces produced** so the
> next agent knows what now exists without reading all the code.

**Status legend:** `TODO` (not started) · `WIP` (in progress — put your branch name)
· `DONE` (merged, acceptance criteria pass) · `BLOCKED` (see Blockers/notes).

Last updated: 2026-08-22 · by: Mukunda (S03)

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
| S01 | Database (Prisma) | DONE | Ranganath | feat/s01-database | S00 | Migration `init`, `db:seed`, demo creds, `@dayflow/db` export |
| S02 | Shared package | DONE | Chandan | feat/s02-shared | S00 | Zod schemas + `z.infer` types + enums/routes/envelope (see detail) |
| S03 | API core | DONE | Mukunda | feat/s03-api-core | S01, S02 | app bootstrap, middleware, `AppError`, `/health` (see detail) |
| S04 | Auth module | TODO | Chandan | — | S03 | auth endpoints, `requireAuth`/`requireRole`, token shape |
| S05 | Employee & department | TODO | Ranganath | — | S03 | employee/department/company endpoints, loginId helper |
| S06 | Attendance module | DONE | Pramith | feat/s06-attendance | S03 | 5 attendance endpoints, exported `computeWorkStatus` helper (see detail) |
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
- **Ranganath** (backend): S01 → S05 → S07 → S09. *S09 is last (needs all of S04–S08).*
- **Pramith** (frontend): S10 → S11 → S13. *S10 unlocks all frontend.*
- **Mukunda**: **S03 (API core)** → S14 → S15 → S12. *Takes S03 first — it's unblocked by S01+S02 and gates all backend modules; frontend pages follow once S10 + their modules land.*
- **All four**: S16 together at the end.

**Wave order:** ① Chandan S00 (solo) → ② Ranganath S01 + Chandan S02 (parallel) →
③ Mukunda S03 + Pramith S10 (parallel) → ④ backend fans out (Chandan S04/S06/S08,
Ranganath S05/S07) while frontend follows each module (Pramith S11→S13, Mukunda
S14→S15) → ⑤ Ranganath S09 + Mukunda S12 → ⑥ all four on S16.

---

## Interfaces produced (detail)

> As each session finishes, append a short block here so the next agent can code
> against real names without re-reading everything. Example format below.

### S06 — Attendance module (DONE)
Files under `apps/api/src/modules/attendance/` (layered route→controller→service→prisma):
- **Endpoints** (mounted at `/api/v1/attendance` via `router.use('/attendance', attendanceRouter)`):
  - `POST /check-in` (EMPLOYEE) → `201 { id, checkInTime, status:'PRESENT', workStatus:'PRESENT' }`.
    Second check-in same day → **`409 CONFLICT`** (detail `code:'ALREADY_CHECKED_IN'`) via the
    `@@unique([employeeId,date])` guard.
  - `POST /check-out` (EMPLOYEE), body `CheckOutSchema` (`breakMinutes?`) →
    `200 { id, checkOutTime, breakMinutes, hoursWorked, extraHours }`. No check-in today → **404**;
    already checked out → **`409`** (detail `code:'ALREADY_CHECKED_OUT'`).
  - `GET /me` (EMPLOYEE), query `{ range: daily|weekly|monthly (default monthly), cursor?, limit? }` →
    `200 data:[{ id,date,checkInTime,checkOutTime,breakMinutes,hoursWorked,extraHours,status }]`,
    `meta:{ nextCursor, limit }`.
  - `GET /` (ADMIN/HR), query `AttendanceListQuerySchema` (`date?`,`departmentId?`,`status?`) + `cursor?`,`limit?`
    → rows also carry `employeeId` + `employee:{ name, departmentId }`; `meta` cursor.
  - `GET /summary` (ADMIN/HR), query `{ date? (YYYY-MM-DD, default today) }` →
    `200 { totalEmployees, present, absent, onLeave }`.
- **Hours math (ADR-019):** `hoursWorked = round2((checkOut−checkIn) − breakMinutes/60)` (≥0),
  `extraHours = max(0, hoursWorked − 8)`. **Standard workday = 8h.** Stored `Decimal(5,2)`.
- **Range windows** (UTC, date-only, inclusive, ending today): `daily`=today; `weekly`=last 7 days
  (today−6…today); `monthly` (**default**)=1st-of-current-month…today, day-wise.
- **Summary rule** (S12 must match): `totalEmployees`=active employees (`User.isActive`);
  `present`=rows that day with `PRESENT`|`HALF_DAY`; `onLeave`=`ON_LEAVE` rows;
  `absent`=`max(0, total−present−onLeave)`. Invariant: `present+absent+onLeave === totalEmployees`.
- **Exported `workStatus` helper (ADR-017), for S05/S12/S13:**
  `computeWorkStatus(employeeId: string, date?: Date): Promise<'PRESENT'|'ABSENT'|'ON_LEAVE'>`
  **Import path:** `import { computeWorkStatus } from '../attendance/work-status.js'` (adjust the
  relative prefix from your module; also re-exported by `attendance.service.js`).
  `work-status.ts` also exports `today()` and `toDateOnly(date)` UTC-midnight helpers and the
  `WorkStatus` type. Rule: `ON_LEAVE` if attendance row `ON_LEAVE` or an APPROVED `LeaveRequest`
  spans the date; `PRESENT` if row `PRESENT`/`HALF_DAY` or has `checkIn`; else `ABSENT`.
- **Note:** `req.user` = `{ id (User.id), role }` — employee routes map to `Employee.id` via
  `resolveEmployeeId(userId)`. Runtime protected-route testing is blocked until S04 fills the
  `requireAuth`/`requireRole` stubs. S03's referenced shared `validate`/`sendSuccess` helpers were
  not committed, so a local `attendance.http.ts` provides them (swap to shared when they land).

### S03 — API core (DONE)
- **Boot:** `apps/api/src/server.ts` is the process entry (`npm run dev -w apps/api`,
  loads `apps/api/.env` via `tsx --env-file`); listens on `env.PORT` (default 8000),
  connects Redis, handles `SIGINT`/`SIGTERM`. `apps/api/src/app.ts` builds the Express
  app (helmet, cors from `CORS_ORIGIN`, `express.json`, request-id, pino-http request
  logging, rate limit, router, `notFound`, `errorHandler` — in that order) and
  exports `app` with no `listen()`.
- **Env:** `apps/api/src/config/env.ts` exports typed `env` (Zod-validated); invalid
  env logs issues and `process.exit(1)`.
- **Errors:** `apps/api/src/lib/errors.ts` exports `AppError` + `NotFoundError` (404),
  `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403),
  `ConflictError` (409). `apps/api/src/middleware/error.ts` is the single global
  handler: `AppError` → its status + ADR-010 envelope; `ZodError` → 400
  `VALIDATION_ERROR` with `error.details` from `.flatten()`; anything else → 500
  `INTERNAL_ERROR` (logged via pino, never leaked to the client).
  `apps/api/src/middleware/not-found.ts` renders unmatched routes the same way.
- **Clients:** `apps/api/src/lib/prisma.ts` re-exports `prisma` from `@dayflow/db`
  (no second client). `apps/api/src/lib/redis.ts` exports a single shared `redis`
  (`ioredis`) instance built from `REDIS_URL`. `apps/api/src/lib/logger.ts` exports
  the shared `pino` `logger`.
- **Auth stubs (for S04):** `apps/api/src/middleware/auth.ts` exports
  `requireAuth(req, res, next)` and `requireRole(...roles: Role[])` with final
  signatures; both currently `throw new UnauthorizedError('... not implemented yet (see S04)')`.
  Also exports `AuthUser { id: string; role: Role }` and augments
  `Express.Request.user?: AuthUser` — import this type, don't redeclare it.
- **Rate limiting:** `apps/api/src/middleware/rate-limit.ts` exports
  `rateLimit({ windowSeconds, max })`, a Redis fixed-window limiter keyed by
  `${baseUrl}${path}:${ip}`; sets `X-RateLimit-Limit/Remaining/Reset`. A default
  instance (`windowSeconds: 60, max: 100`) is applied to all of `/api/v1` in
  `app.ts`. **S04 should apply a tighter instance directly on the auth router**
  (e.g. signin/signup) rather than relying on this default.
- **Router:** `apps/api/src/routes/index.ts` exports `router`, mounted at
  `API_BASE` (`/api/v1`) in `app.ts`. `GET /api/v1/health` →
  `{ success:true, data:{ status:"ok" } }`. TODO comments mark exactly where S04–S09
  mount their feature routers — add `router.use('/auth', authRouter)` etc. there.
- **Request id:** `apps/api/src/middleware/request-id.ts` sets `req.id` (UUID) and
  echoes it as `X-Request-Id`.
- **New deps added to `apps/api`:** `helmet`, `cors` (+`@types/cors`), `ioredis`,
  `pino`, `pino-http`. Dev/start scripts now point at `server.ts` (was the S00
  placeholder `index.ts`, which is deleted).
- Unblocks S04–S08 (all can now build feature routers/services against real
  `AppError`, `requireAuth`/`requireRole` stubs, `prisma`, `redis`, `logger`).

### S01 — Database (Prisma) (DONE)
- `packages/db/prisma/schema.prisma` contains the final schema per ADRs.
- `packages/db/prisma/seed.ts` provides a rich, idempotent demo dataset.
- `packages/db/src/index.ts` exports `prisma` singleton and re-exports `@prisma/client` types.
- Initial migration applied.

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

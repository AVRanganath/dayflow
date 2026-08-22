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
| S04 | Auth module | DONE | Pramith | feat/s04-auth | S03 | auth endpoints, `requireAuth`/`requireRole`, JWT+bcrypt, refresh cookie (see detail) |
| S05 | Employee & department | DONE | Chandan | feat/s05-employee | S03 | employee/department/company endpoints, `generateLoginId`, `computeWorkStatus`, row-level guard (see detail) |
| S06 | Attendance module | TODO | Chandan | — | S03 | attendance endpoints, `workStatus` helper |
| S07 | Leave module | TODO | Ranganath | — | S03 | leave endpoints, balance logic, allocations |
| S08 | Payroll module | TODO | Chandan | — | S03 | payroll endpoints, salary engine, payslip PDF |
| S09 | Realtime + notifications + audit | TODO | Ranganath | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | DONE | Pramith | feat/s10-web-foundation | S02 | api client (`get/post/put/patch/del`), AuthProvider, RequireAuth, AppShell, 11 UI primitives, formatINR |
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

### S05 — Employee & Department (DONE)
- **Routers mounted** in `apps/api/src/routes/index.ts`: `/employees`, `/departments`,
  `/company`. All routes behind `requireAuth`; management routes add
  `requireRole('ADMIN','HR')`, company update adds `requireRole('ADMIN')`.
- **Endpoints (base `/api/v1`):**
  - `POST /employees` (ADMIN/HR, ADR-012) — body `CreateEmployeeSchema`. Auto-mints
    `loginId` + temp password + `employeeId`/`employeeCode` (`EMP0001`…), creates
    `User`+`Employee`+default `LeaveBalance` (PAID 24/SICK 7/CASUAL 7) in ONE
    transaction. `201` → `{ id (employeeId), firstName, lastName, email, loginId, role,
    temporaryPassword, mustChangePassword:true }`. `temporaryPassword` is returned
    **once here only**.
  - `GET /employees` (ADMIN/HR) — query `EmployeeListQuerySchema` + `PaginationQuerySchema`
    (`cursor`, `limit` default 20). `search` = case-insensitive over firstName/lastName/
    email; AND-combined with `departmentId`/`employmentType`/`role` filters. Each row
    carries computed `workStatus` (ADR-017). Envelope `meta:{ nextCursor, limit }`.
  - `GET /employees/me` (any auth) — caller's own `Employee` (resolved from
    `req.user.id` = User id → `Employee.userId`), incl. `workStatus`, `user.loginId/role/
    mustChangePassword`.
  - `PUT /employees/me` (any auth) — restricted self-update; body `UpdateProfileSchema`
    (`.strict()`, self-editable subset only: phone, personalEmail, address, city, state,
    country, zipCode, profilePicture, resume fields about/whatILove/hobbies/skills/
    certifications). Any other key → 400 `VALIDATION_ERROR`.
  - `GET /employees/:id` — ADMIN/HR **or self**; row-level enforced in service via
    `assertCanAccessEmployee` (EMPLOYEE reading another id → `403 FORBIDDEN`).
  - `PUT /employees/:id` (ADMIN/HR) — body `AdminUpdateEmployeeSchema` (full ADR-015
    set incl. `managerId`). Validates `managerId`/`departmentId` exist; rejects
    self-referential `managerId` → 400.
  - `PATCH /employees/:id/profile-picture` — ADMIN/HR or self. **Accepts JSON `{ url }`**
    (multipart storage stubbed, see log/upload.ts); returns `{ profilePictureUrl }`.
  - `GET /departments` (any auth) → `[{ id, name, description }]`, sorted by name.
  - `GET /company` (any auth) → full `Company` row (`id, name, logoUrl, loginIdPrefix,
    settings, createdAt, updatedAt`).
  - `PUT /company` (**ADMIN-only**) — body `UpdateCompanySchema`. `settings` is
    **shallow-merged** onto existing settings (partial patch keeps other keys).
- **Helpers (in `apps/api/src/lib/`, reusable by other sessions):**
  - `login-id.ts`: `generateLoginId(prefix, firstName, lastName, joinYear, serial)` (pure,
    unit-tested, `OIJODO20220001`) + `generateTempPassword(length=12)`.
  - `work-status.ts`: `computeWorkStatus(employeeId)` / `computeWorkStatuses(ids[])`
    (batched, no N+1) + `todayRange()`. PRESENT = attendance today with checkIn;
    ON_LEAVE = approved leave covering today; else ABSENT. **S06 may replace with its
    canonical helper** (imported here as a local minimal version, ADR-017).
  - `password.ts`: `hashPassword(plain)` (bcryptjs, 10 rounds) — S04 may fold into its own.
  - `pagination.ts`: `cursorArgs(limit, cursor?)` + `buildPage(rows, limit)` (id-based
    cursor, fetches limit+1, stable `orderBy:{ id:'asc' }`).
  - `http.ts`: `sendSuccess(res, data, status?, meta?)` + `asyncHandler(fn)` (Express-4
    async error forwarding). `validate.ts`: `validate(schema, 'body'|'query'|'params')`.
  - `upload.ts`: `ProfilePictureUrlSchema` + `resolveProfilePictureUrl` (URL stub).
- **Row-level rule:** `assertCanAccessEmployee(reqUser, targetEmployeeId)` — ADMIN/HR pass
  for any id; EMPLOYEE only for their own (resolved via userId→employeeId). Reused by
  `getById` and the self-scoped profile-picture path.
- **Notes for S12/S13:** the auth principal is `{ id: <User.id>, role }` — the employee id
  is looked up server-side, never sent by the client. `passwordHash` is never selected/
  returned. New dep added to `apps/api`: `bcryptjs` (^3.0.3, ships own types).
- **Testing caveat:** protected routes could not be curl-tested at runtime — S04's
  `requireAuth`/`requireRole` are still stubs that throw. Service logic was verified via a
  throwaway tsx script against the seeded DB (all criteria pass at the service layer).
### S04 — Auth (DONE)
- **Endpoints** (all under `/api/v1/auth`, tighter rate limit 10 req/60s per IP):
  `POST /signup` (company/admin onboarding, ADR-012 — 201, gated on `count(ADMIN)===0`
  else `403 REGISTRATION_CLOSED`; creates Company + first ADMIN User + Employee in one
  `$transaction`; returns `{ company, user, accessToken }`), `POST /signin`
  (`{ identifier, password }`, email OR loginId; `401 INVALID_CREDENTIALS`; returns
  `{ user, accessToken }` incl. `mustChangePassword`), `POST /refresh` (cookie-based,
  rotates + blacklists old, returns `{ accessToken }`), `POST /logout` (clears cookie +
  blacklists), `POST /change-password` (requireAuth; clears `mustChangePassword`),
  `GET /verify-email/:token`, `POST /forgot-password` (no enumeration, logs link),
  `POST /reset-password`.
- **Guards** (import from `apps/api/src/middleware/auth.ts`, relative `../../middleware/auth.js`):
  `requireAuth(req,res,next)` — reads `Authorization: Bearer <token>`, verifies the
  access JWT, sets `req.user`, else throws `UnauthorizedError` (401). `requireRole(...roles: Role[])`
  → returns middleware; throws `ForbiddenError` (403) if `req.user.role` ∉ roles (run
  after `requireAuth`). ADMIN+HR are management (ADR-001), e.g. `requireRole('ADMIN','HR')`.
- **`req.user` shape:** `AuthUser { id: string; role: Role }` (the S03 stub type, kept
  as-is). `employeeId` is NOT on `req.user`; it rides inside the access-token payload —
  S05+ that need it should decode/verify the token or look up `Employee` by `userId`.
- **Tokens (ADR-007):** access JWT 15m (`JWT_ACCESS_SECRET`/`_EXPIRY`), payload
  `{ sub: userId, employeeId: string|null, role }`, returned in JSON body. Refresh JWT
  7d (`JWT_REFRESH_SECRET`/`_EXPIRY`), payload `{ sub, role, jti }`, delivered as the
  **HttpOnly** cookie `dayflow_rt` (`SameSite=Strict`, `Secure` in prod, `Path=/api/v1/auth`,
  `maxAge` 7d). Helpers in `apps/api/src/lib/jwt.ts`: `signAccessToken`, `signRefreshToken`,
  `verifyAccess`, `verifyRefresh`.
- **Password helpers** `apps/api/src/lib/password.ts`: `hashPassword`, `comparePassword`
  (bcryptjs, cost 10).
- **Blacklist:** on logout/refresh-rotation, the refresh token's `jti` is stored in Redis
  key `auth:blacklist:<jti>` with TTL = remaining lifetime; `refresh` rejects blacklisted
  jtis (`401`). Fails open if Redis is down.
- **New building blocks added (S03 STATE listed these as existing but they were absent):**
  `apps/api/src/lib/response.ts` → `sendSuccess(res, data, status?, meta?)` (ADR-010
  envelope); `apps/api/src/middleware/validate.ts` → `validate(schema)` (parses `req.body`,
  forwards ZodError → 400 `VALIDATION_ERROR`). S05+ should reuse these.
- **App wiring:** `cookie-parser` added to `app.ts`; `router.use('/auth', authRouter)` in
  `routes/index.ts`. New deps in `apps/api`: `bcryptjs`, `jsonwebtoken`, `cookie-parser`
  (+ `@types/*`).
- Unblocks S11 (auth pages) and lets S05–S08 guard routes with `requireAuth`/`requireRole`.

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

### S10 — Web foundation (DONE)
- **App framework:** Next.js 14 (App Router) in `apps/web`. Dev server on port 3000 (`npm run dev -w apps/web`).
- **Design Tokens (`apps/web/tailwind.config.ts`):**
  - Colors: `primary` (`#714B67`), `primary-hover` (`#5B3C53`), `sidebar` (`#2F1F2B`), `primary-tint` (`#F4EEF3`), `primary-tint-border` (`#D6C4D1`), `secondary` (`#017E84`), `secondary-tint` (`#E0F0F1`), `secondary-on-dark` (`#8FC9CC`), `accent` (`#F0B93F`), `success` (`#10B981`), `warning` (`#F59E0B`), `danger` (`#EF4444`), `background` (`#F5F6F7`), `card` (`#FFFFFF`), `zebra` (`#FAFAFB`), `border` (`#DEE2E6`), `hairline` (`#EDEFF1`), and full text color hierarchy.
  - Fonts: `sans` (Roboto 300/400/500/700), `display` (Montserrat 600/700/800), `marker` (Caveat Brush 400).
  - Radii: `sm` (3px), `DEFAULT`/`card`/`btn` (4px), `container` (6px), `pill` (99px).
  - Shadows: `card`, `hero`, `auth`, `modal`, `card-hover`.
- **API client (`apps/web/src/lib/api/client.ts`):**
  - Typed methods: `api.get<T>`, `api.post<T>`, `api.put<T>`, `api.patch<T>`, `api.del<T>`, `api.refresh()`.
  - Unwraps `{ success: true, data }`; throws `ApiError(code, message, details, status)` on failure.
  - Single-flight auto-refresh on 401 via `POST /auth/refresh` (ADR-007) with retry; clears session and redirects to `/signin` if refresh fails.
- **Auth subsystem (`apps/web/src/lib/auth/`):**
  - `auth-store.ts`: in-memory token and user store (`setSession`, `clearSession`, `getAccessToken`, `getUser`).
  - `AuthProvider.tsx`: React context with silent rehydration on mount. Exposes `{ user, isLoading, isAuthenticated, login, logout, refreshSession }`.
  - `useAuth()` hook.
  - `RequireAuth` and `RequireRole` route guards.
- **Layout components (`apps/web/src/components/layout/`):**
  - `Sidebar.tsx`: dark plum 260px sidebar with role-filtered nav items (Employee vs Admin/HR).
  - `Header.tsx`: page title, marker greeting, notification bell with red dot, avatar dropdown.
  - `AppShell.tsx`: responsive layout handling desktop sidebar, mobile slide-over drawer, and mobile bottom nav.
- **11 UI Primitives (`apps/web/src/components/ui/`):**
  - `Button`, `Input`, `Select`, `Textarea`, `StatusBadge`, `DataTable`, `Modal`, `Avatar`, `EmptyState`, `Toast` / `ToastProvider` (`useToast`), `ProgressBar`, `StatsCard`.
- **Formatters (`apps/web/src/lib/format.ts`):**
  - `formatINR(amount)` (e.g. ₹42,50,000), `formatHours(val, isMinutes?)`, `formatDate(date)`, `initials(name)`, `getAvatarColor(name)`.

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

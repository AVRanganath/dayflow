# Session Log — S05 Employee & Department Module

- **Session:** S05 — Employee & Department module
- **Agent / model:** Claude Code (Opus 4.8, 1M context)
- **Branch:** feat/s05-employee
- **Status at end:** DONE

## What I built

Modules (`apps/api/src/modules/`):
- `employee/employee.route.ts` — router at `/employees`, all behind `requireAuth`;
  admin routes add `requireRole('ADMIN','HR')`. `/me` declared before `/:id`.
- `employee/employee.controller.ts` — thin controllers (parse → service → `sendSuccess`).
- `employee/employee.service.ts` — `createEmployee` (ADR-012 transaction),
  `listEmployees` (cursor + search + filters + `workStatus`), `getMe`, `updateMeSelf`,
  `getById`, `updateByIdAdmin` (ADR-015 incl. `managerId`), `setProfilePicture`,
  `assertCanAccessEmployee` (row-level), `resolveEmployeeId`.
- `department/{route,controller,service}.ts` — `GET /departments`.
- `company/{route,controller,service}.ts` — `GET /company` (any auth) + `PUT /company`
  (ADMIN-only, settings shallow-merged).

Lib helpers (`apps/api/src/lib/`):
- `login-id.ts` — pure `generateLoginId` + `generateTempPassword`. **Unit-tested** in
  `login-id.test.ts` (Node built-in `node:test`, 8 tests, all pass).
- `work-status.ts` — `computeWorkStatus`/`computeWorkStatuses` (batched) + `todayRange`.
- `password.ts` — `hashPassword` (bcryptjs).
- `pagination.ts` — `cursorArgs` + `buildPage` (id cursor).
- `http.ts` — `sendSuccess` + `asyncHandler`. `validate.ts` — Zod `validate` middleware.
- `upload.ts` — profile-picture URL stub schema + resolver.

Wiring: mounted the three routers at the `// TODO(S05)` line in `routes/index.ts`.
Added `bcryptjs` to `apps/api/package.json`.

## Key decisions
- **`req.user` shape.** S03's `AuthUser` is `{ id, role }` where `id` is the **User** id
  (not employeeId). The spec referenced `req.user.employeeId`, which doesn't exist on the
  final type. I resolve the employee id server-side (`Employee.userId → id`) via
  `resolveEmployeeId`. S04/S12/S13 should rely on this: clients never send their own
  employee id.
- **`employeeId` / `employeeCode` generation.** `CreateEmployeeSchema` has no employeeId,
  but the column is required + unique. I derive `EMP` + 4-digit serial (same serial as the
  loginId), and set `employeeCode` equal to it (ADR-015 says employeeCode "may equal
  employeeId").
- **Login-ID serial** is per company **and** per join-year: counted inside the transaction
  as `count(employees with companyId + dateOfJoining in that year) + 1`. Verified: John Doe
  joining 2022 as the first 2022 joiner → `OIJODO20220001`.
- **Default leave balances** set to PAID 24 / SICK 7 / CASUAL 7 (ADR-018 allocation
  example) for the join year, created in the same transaction (ADR-004 tracked types).
- **Company `settings` update is a shallow merge** onto the existing JSON so a partial
  `PUT /company { settings: { professionalTax } }` doesn't wipe the other keys.
- **`workStatus` helper is local** (minimal ADR-017 derivation). S06 owns the canonical
  attendance helper; when it lands it can replace `lib/work-status.ts` and this module can
  import it instead.

## Deviations from the session file
- **Profile-picture is a `{ url }` JSON body, not multipart.** `multer` cannot be installed
  in this offline/sandboxed env (`npm install` has no network / cache miss). The session
  file explicitly permits this: "multipart or a `{ url }` body — if no storage exists,
  accept a URL and note the stub." Contract (`{ profilePictureUrl }`) is unchanged, so
  S13 can swap in real multipart storage later without a contract break. See `lib/upload.ts`.
- **`sendSuccess` / `validate` / cursor-pagination helper were NOT present from S03.** The
  session file said to reuse them from S03, but S03 only shipped errors/prisma/redis/logger/
  auth-stubs. I added minimal versions in `lib/` (`http.ts`, `validate.ts`, `pagination.ts`)
  — kept generic so S06–S08 can reuse them.
- **No dedicated test runner (vitest/jest).** Only `tsx` is available, so the unit test uses
  Node's built-in `node:test` (`npx tsx --test src/lib/login-id.test.ts`).
- **`employee.test.ts` (row-level/restricted-field) was optional** — I verified those paths
  via a throwaway tsx smoke script instead (see below) rather than committing a test that
  needs a live DB + a runner that isn't wired into CI.

## Gotchas / things that bit me
- `requireAuth`/`requireRole` are **still S04 stubs that throw** — you cannot curl any
  protected route yet. This is expected; do not "fix" it here (S04 owns `auth.ts`).
- `req.query`/`req.params` are read-only getters on some Express typings — the `validate`
  middleware assigns the parsed value back via a narrow cast.
- Run `npx prisma generate` (schema at `packages/db/prisma/schema.prisma`) before typecheck
  or `@prisma/client` types (the `Prisma` namespace, `EmployeeGetPayload`, etc.) won't exist.

## Acceptance criteria result
- `npm run typecheck` → **PASS** (0 errors, all 5 packages).
- `npm run lint` → **PASS** (0 errors).
- `npx prettier --check "apps/api/src/**/*.ts"` → **PASS**.
- `generateLoginId` unit tests → **PASS** (8/8, incl.
  `generateLoginId('OI','John','Doe',2022,1) === 'OIJODO20220001'`).
- Service-layer smoke test against the seeded DB (auth bypassed, throwaway tsx script,
  cleaned up after) — all **PASS**:
  - Departments list (5), Company get ("Odoo India"/OI).
  - `listEmployees` returns rows with `workStatus` + a next cursor.
  - `search=john` narrows to Alice Johnson + John Doe (case-insensitive).
  - Row-level: EMPLOYEE cross-read → 403; self-read + ADMIN cross-read allowed.
  - `getMe` returns own profile incl. `loginId`.
  - `updateByIdAdmin` with self-referential `managerId` → rejected.
  - `createEmployee` (John Doe, 2022) → `loginId OIJODO20220001`, 12-char temp password,
    `mustChangePassword:true`, and PAID:24/SICK:7/CASUAL:7 balances in one transaction.
- **Blocked at runtime:** protected-route curl tests (list/create/me/company PUT with real
  tokens) require S04's auth to be implemented. Verified at the service layer instead.

## Handoff — what's now unblocked / TODO
- **S13 (Profile + directory)** can build against the employee/department/company contracts
  above once S04 lands.
- **S04 (Auth)** should: implement `requireAuth`/`requireRole`, and can reuse
  `lib/password.ts` (`hashPassword`) and the `loginId`/`mustChangePassword` fields this
  module writes. Sign-in must accept email **or** `loginId` (ADR-012).
- **S06 (Attendance)** owns the canonical `workStatus` helper — replace/point
  `lib/work-status.ts` at it when ready.
- **Follow-ups deliberately left:** real multipart/object-storage upload for profile
  pictures (currently a URL stub); once S04 merges, run the protected-route curl acceptance
  commands from the session file end-to-end.

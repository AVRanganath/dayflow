# Dayflow — Build State Ledger

> **This file is the single source of truth for build progress.** Every session
> reads it at the start (Step 1) and updates it at the end (Step 6). See
> `build/SESSION_PROTOCOL.md`. Keep entries terse and factual. When you finish a
> session, set its **Status** to `DONE` and fill its **Interfaces produced** so the
> next agent knows what now exists without reading all the code.

**Status legend:** `TODO` (not started) · `WIP` (in progress — put your branch name)
· `DONE` (merged, acceptance criteria pass) · `BLOCKED` (see Blockers/notes).

Last updated: 2026-08-22 · by: Ranganath (S13)

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
| S06 | Attendance module | DONE | Pramith | feat/s06-attendance | S03 | 5 attendance endpoints, exported `computeWorkStatus` helper (see detail) |
| S07 | Leave module | DONE | Ranganath | feat/s07-leave | S03 | leave endpoints, balance logic, allocations (see detail) |
| S08 | Payroll module | DONE | Chandan | feat/s08-payroll | S03 | payroll endpoints, salary engine, payslip PDF (see detail) |
| S09 | Realtime + notifications + audit | TODO | Ranganath | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | DONE | Pramith | feat/s10-web-foundation | S02 | api client (`get/post/put/patch/del`), AuthProvider, RequireAuth, AppShell, 11 UI primitives, formatINR |
| S11 | Auth pages | DONE | Pramith | feat/s11-auth-pages | S10, S04 | `/signin`, `/signup` (onboarding), `/change-password`, `(auth)` layout, `features/auth` components |
| S12 | Dashboards + analytics | TODO | Mukunda | — | S10, S06–S08 | `/dashboard` (both roles), charts |
| S13 | Profile + directory | DONE | Pramith | feat/s13-profile-directory | S10, S05 | `/profile`, `/employees`, `/employees/:id` (view-only); `lib/employees.ts` fetchers (see detail) |
| S14 | Attendance + leave pages | DONE | Mukunda | feat/s14-attendance-leave | S10, S06, S07 | `/attendance`, `/leaves`, `/leaves/approvals` pages; attendance/leaves api helpers; CSV export; NO SSE (S09 TODO) |
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

### S14 — Attendance & Leave pages (DONE)
- **Routes added** (under `apps/web/src/app/(protected)/` — the S10 route group is
  `(protected)`, not the session file's aspirational `(app)`):
  - `/attendance` (`attendance/page.tsx`) — check-in/out (green→red), status line,
    hours-worked progress bar, Daily/Weekly/Monthly toggle, summary bar, and the
    ADMIN/HR all-employees table with CSV export. Sub-components in
    `attendance/_components/`: `attendance-calendar.tsx` (monthly grid, ADR-005 dots +
    legend), `attendance-weekly.tsx` (Day|Date|In|Out|Hours|Status + totals),
    `attendance-list.tsx` (ADR-019 day-wise: Date|Check In|Check Out|Work Hours|Extra
    Hours|Break), `attendance-summary.tsx` (Present/Absent/Half-days/Leaves/Total Hours),
    `admin-attendance-table.tsx` (employee selector + CSV), `attendance-status.ts`
    (shared status→colour/label map + `formatTime`).
  - `/leaves` (`leaves/page.tsx`) — balance cards (ADR-004: Paid teal, Sick amber,
    Casual green, Unpaid ∞ gray), Apply button, history table.
    `leaves/_components/`: `apply-leave-modal.tsx` (auto Total Days weekends-skipped,
    Zod `ApplyLeaveSchema`, attachment upload ADR-018), `leave-history-table.tsx`
    (expandable rows → reviewer comment, Status+Year filters, client pagination).
  - `/leaves/approvals` (`leaves/approvals/page.tsx`) — **ADMIN/HR only**, employees
    redirected to `/dashboard`; stats bar, filter/sort bar, request cards, Allocate
    Leave (ADR-018). `approvals/_components/`: `leave-request-card.tsx` (avatar,
    type badge, range+days, expandable reason, Approve green/Reject red with comment;
    reject reason required via `RejectLeaveSchema`), `allocation-modal.tsx`
    (`POST /leaves/allocations`), `empty-state.tsx` (wraps S10 EmptyState).
- **API helpers (`apps/web/src/lib/api/`):**
  - `attendance.ts` — `checkIn(location?)`, `checkOut(breakMinutes?)`,
    `getMyAttendance(range='monthly', cursor?)`, `getAllAttendance(filters)` +
    `MyAttendanceRow`/`AdminAttendanceRow`/`CheckInResult`/`CheckOutResult` types.
  - `leaves.ts` — `applyLeave(fields)` (multipart when `file` present, else JSON with
    optional `attachmentUrl`), `getMyLeaves`, `getAllLeaves(status?)`, `approveLeave`,
    `rejectLeave`, `getMyBalance`, `allocateLeave`, `getEmployeeOptions`,
    `getDepartments` + `MyLeaveRow`/`AdminLeaveRow`/`LeaveBalanceSummary` types.
    **IMPORTANT for S12/S15: the leave API field is `leaveType` (not `type`),
    `totalDays` is a Decimal serialised as a STRING, and the single reviewer field is
    `reviewerComment` (there is no separate `rejectionReason`/`reviewNotes`). The admin
    leave row's `employee` carries only `{ firstName, lastName }` — no department, so
    department is mapped client-side via `GET /employees`.** Attendance `hoursWorked`/
    `extraHours`/`breakMinutes` can be `null`.
  - `raw.ts` — `getWithMeta<T>(path, params?)`: an envelope-aware GET returning
    `{ data, meta }` (the S10 `api` client discards `meta`, losing the cursor). Reuse
    for any paginated list. Handles Bearer + single-flight refresh like the client.
- **Utils (`apps/web/src/lib/`):** `csv.ts` (`toCsv(rows, columns)` + `downloadCsv`),
  `working-days.ts` (`countWorkingDays(start,end)` — UTC, inclusive, skips Sat/Sun,
  mirrors S07's server rule; server count is authoritative on the response).
- **SSE:** NOT wired — S09 is still `TODO`, so all pages reflect on refresh. When S09
  lands, add `apps/web/src/lib/realtime.ts` (SSE over `GET /api/v1/events`) and have the
  approvals + history/balance views subscribe (see S14 log for the seams).
- **No `@dayflow/shared` schema changes.** Used existing `ApplyLeaveSchema`,
  `RejectLeaveSchema`, `AllocateLeaveSchema` (field `type`, optional `year`), `API_ROUTES`.
- **Role gates (ADR-001):** the Sidebar already role-filters nav (`/leaves` for
  employees, `/leaves/approvals` for ADMIN/HR); `/leaves/approvals` also redirects
  employees to `/dashboard` at the route, and the admin attendance table is hidden from
  employees. API remains the final gate.
### S13 — Profile & Employee Directory (DONE)
- **Routes added** (all under `apps/web/src/app/(protected)/` — the real S10 route
  group; the session file's `app/(app)/` path was aspirational):
  - `/profile` — PAGE 5, role-agnostic. Loads `GET /employees/me`. Header (120px avatar
    w/ camera upload, name, designation, department badge, Employee ID, "Edit Profile")
    + board tabs (ADR-015): **Resume**, **Private Info**, **Job Details**, and
    **Salary Info (ADMIN-only, ADR-013)**. Tab components in `profile/_components/`:
    `resume-tab.tsx`, `private-info-tab.tsx`, `job-details-tab.tsx`, `salary-info-tab.tsx`,
    `avatar-upload.tsx`, `profile-field.tsx` (shared `ReadonlyField` locked-box).
  - `/employees` — PAGE 6, **ADMIN/HR only**. Top bar (title + live count, search,
    Department/Employment-Type/Status filters, "Add Employee"), a **table ⇄ card-grid**
    toggle, and cursor pagination. Components in `employees/_components/`:
    `employee-table.tsx`, `employee-card.tsx` (ADR-017 work-status icon), `employee-filters.tsx`
    (debounced search), `employee-pagination.tsx`.
  - `/employees/:id` — **view-only** employee page (read-only reuse of the profile view;
    no edit controls). ADMIN/HR only; opened by clicking a directory row or card.
- **API helper `apps/web/src/lib/employees.ts`** (typed, no `any`): `getMe()`,
  `updateMe(body)` (`PUT /employees/me`, shared `UpdateProfileSchema`), `getEmployee(id)`,
  `uploadProfilePicture(id, file)` (reads the File → base64 **data URL** → `PATCH
  /employees/:id/profile-picture` JSON `{ url }`; the stub schema `z.string().url()`
  accepts data URLs and returns them verbatim, so the picture round-trips), `listEmployees(params)`
  (**reads the raw envelope** to get `meta.nextCursor` — S10's `api.get` drops `meta`),
  `listDepartments()`, plus the `Employee`/`Department`/`EmployeePage` response types
  (declared here — `@dayflow/shared` only infers *input* types).
- **Role-gate pattern:** the directory + view-only route redirect non-management users
  (`role !== ADMIN|HR`) to `/dashboard` in a `useEffect` and render a spinner meanwhile;
  the S10 sidebar already hides the nav item for employees; the API's `requireRole` +
  row-level guard are the final gate. **Salary Info tab** is gated on `role === 'ADMIN'`.
- **Work-status icon source:** the `workStatus` field (`PRESENT|ABSENT|ON_LEAVE`, ADR-017)
  on each `/employees` row and on `/employees/me` → 🟢 / 🟡 / ✈️ on the directory card
  (top-right) and the view-only header.
- **Resume-tab fields:** **found** — `about/whatILove/hobbies/skills/certifications` are on
  the `/employees/me` payload and self-editable via `PUT /employees/me` (verified end-to-end
  against the seeded DB). `skills`/`certifications` are **string arrays** (comma-separated
  in the UI), not the API.md doc's single string — the shared schema (`z.array(z.string())`)
  is authoritative.
- **No shared-schema changes.** One web-only build fix: `apps/web/next.config.mjs` gained a
  webpack `resolve.extensionAlias` so `@dayflow/shared`'s NodeNext `.js` import specifiers
  resolve to their `.ts` sources when webpack transpiles the package (S13 is the first web
  code to import *runtime* values from the shared barrel, which surfaced this latent gap —
  UI-only imports before never triggered it). Not a contract change.
- **Note for S15 (payroll UI):** the Salary Info tab renders the ADR-013 read-only structure
  with `—` placeholders because `/employees/me` carries **no** salary data — wire it to the
  payroll module when that lands. Job Details shows the reporting manager as `managerId`
  (an employee cannot read another employee's record to resolve a name; row-level guard).
### S11 — Auth Pages (DONE)
- **Routes & Pages (`apps/web/src/app/(auth)/`):**
  - `(auth)/layout.tsx`: Split-screen public auth shell (left 50% brand panel with plum-to-dark-plum gradient, Montserrat Dayflow wordmark, Caveat Brush 52px marker headline with `#F0B93F` marker highlight behind "perfectly aligned.", 340px ring + 120px rotated square geometry, Caveat Brush 22px footnote; right panel hosting auth forms). Auto-redirects authenticated users to `/dashboard` (or `/change-password` if `mustChangePassword=true`).
  - `/signin` (`signin/page.tsx`): "Welcome back" page rendering `SigninForm`.
  - `/signup` (`signup/page.tsx`): "Set up your company" page rendering `OnboardingForm` (ADR-012 first-run company setup; displays registration complete notice with redirect to `/signin` if `403 REGISTRATION_CLOSED`).
  - `/change-password` (`change-password/page.tsx`): Forced first-login password update page rendering `ChangePasswordForm`.
- **Components (`apps/web/src/features/auth/`):**
  - `SigninForm.tsx`: React Hook Form + Zod `SigninSchema` with support for email OR system-generated `loginId`, show/hide password toggle, and red error banner on `INVALID_CREDENTIALS`.
  - `OnboardingForm.tsx`: Company & Admin registration with full-name splitting, password confirmation, dynamic strength meter, and `REGISTRATION_CLOSED` handling.
  - `ChangePasswordForm.tsx`: Password update form calling `POST /auth/change-password`, clearing `mustChangePassword` in the in-memory auth store, and navigating to `/dashboard`.
  - `PasswordField.tsx`: Reusable input with eye toggle icon for password visibility.
  - `PasswordStrength.tsx`: 4-bar dynamic color strength meter (Weak/Fair/Good/Strong).
  - `features/auth/index.ts`: Barrel export.
- **Auth Store Integration:**
  - `apps/web/src/lib/auth/index.ts`: Unified export for `useAuth`, `AuthProvider`, `authStore`, and route guards.
- **Unblocks:** S12 (Dashboards) and S13 (Profile/Directory).

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

### S08 — Payroll module (DONE)
- **Owns:** `apps/api/src/modules/payroll/` (`payroll.routes.ts`, `payroll.controller.ts`,
  `payroll.service.ts`, `payroll.calc.ts`, `payslip.pdf.ts`, `payroll.schema.ts`).
  Mounted at `/api/v1/payroll` via one edit to the S03-owned `apps/api/src/routes/index.ts`
  (`router.use('/payroll', payrollRouter)`, replacing its TODO(S08) line).
- **Routes:**
  - `GET /payroll/me` — any authenticated role, read-only. Caller's own ADR-013
    component breakdown (`currency, monthlyWage, earnings{basic,hra,standardAllowance,
    performanceBonus,lta,fixedAllowance,gross}, deductions{pfEmployee,professionalTax,
    total}, employerContributions{pfEmployer}, monthlyNet, history[]` — history newest
    first, each with `month ("YYYY-MM"), payableDays, workingDays, netSalary, status,
    payslipUrl`). No write path.
  - `GET /payroll` — ADMIN/HR only. `?month=&year=` filter + cursor pagination
    (`cursor`/`limit`, reusing `@dayflow/shared`'s `PayrollListQuerySchema` merged with
    `PaginationQuerySchema` — no shared-contract change needed, both already existed).
  - `GET /payroll/:id/payslip` — owner or ADMIN/HR (row-level ownership check in the
    service, since RBAC middleware can't express "your own record"; non-owner
    non-management → `403`). Streams a PDF (`Content-Type: application/pdf`) rendered
    from the existing `PayrollRecord` snapshot (no on-the-fly recompute — the snapshot
    already encodes ADR-014 proration from when it was generated, e.g. by the S01 seed;
    there is no "run payroll for this month" endpoint in this session's scope).
  - `GET /payroll/:employeeId/salary-structure` — ADMIN-only (ADR-001). Returns the
    detailed shape from `docs/API.md §5` (`earnings.<name>.{computationType,value,amount}`,
    `deductions.<name>.{value,amount}`, `gross`, `monthlyNet`, `totalDeductions`).
  - `PUT /payroll/:employeeId/salary-structure` — ADMIN-only; HR/EMPLOYEE get `403`.
    Body `{ wage, config? }` (`SalaryStructureSchema` from `@dayflow/shared`, unchanged).
    Always recomputes via `computeSalary` — never trusts a client-sent total. Upserts
    `SalaryStructure`.
  - **Route order:** `/:id/payslip` is registered before `/:employeeId/salary-structure`
    per the session spec's guidance, though the two don't actually collide in Express
    (different literal trailing segment).
- **`payroll.calc.ts` (pure, unit-verified, no Prisma/Express import except `Prisma.Decimal`
  and the local `ValidationError`):**
  - `computeSalary(wage, cfg?)` — ADR-013: `basic = basicPct% of wage` (default 50),
    `hra = hraPctOfBasic% of basic` (default 50), `standardAllowance` fixed (default 4167),
    `performanceBonus`/`lta` = their pct of basic (default 8.33 each),
    `fixedAllowance = wage − sum(all above)` (balancer, so `gross === wage`),
    `pfEmployee`/`pfEmployer = pfPct% of basic` (default 12 each; only `pfEmployee` is
    deducted from take-home), `professionalTax` fixed (default 200),
    `monthlyNet = gross − pfEmployee − professionalTax`. All money is `Prisma.Decimal`,
    rounded to 2dp per component. Throws `ValidationError` (400) if `monthlyNet` would
    be negative. Verified against the spec's exact numbers (wage 50,000 → basic 25,000,
    hra 12,500, performanceBonus/lta 2,082.50, pfEmployee 3,000, professionalTax 200,
    monthlyNet 46,800) — see `build/logs/S08-log.md` for how.
  - `prorateByPayableDays(monthlyNet, payableDays, workingDays)` — ADR-014:
    `round(monthlyNet × payableDays / workingDays)` to the nearest whole rupee
    (`Prisma.Decimal.ROUND_HALF_UP`); `workingDays <= 0` short-circuits to
    `round(monthlyNet)`. Verified against the doc example (46,800 × 22/23 → 44,765) and
    against every one of the 90 seeded `PayrollRecord` rows.
- **`payslip.pdf.ts`:** `renderPayslipPdf(data: PayslipData): Promise<Buffer>` using
  `pdfkit`. INR-formatted via `Intl.NumberFormat('en-IN', {style:'currency',
  currency:'INR'})`. Pure function of a plain `PayslipData` object — no Prisma import —
  so it's independently callable/testable.
- **S09 audit hook:** `auditPayrollUpdate({ actorUserId, employeeId, oldValues:
  SalaryStructure|null, newValues: SalaryStructure })`, exported from
  `payroll.service.ts`. Currently a no-op with a `// TODO(S09): persist an AuditLog row +
  notify()` comment; called once, after a successful `PUT .../salary-structure` upsert.
  S09 should replace the body with a real `AuditLog` write (do not change the call site
  or signature unless the contract needs to grow).
- **New dependency:** `pdfkit` (+ `@types/pdfkit` dev) added to `apps/api/package.json`;
  `package-lock.json` updated accordingly (intentional — this is the point of the
  dependency addition, not a stray regeneration).
- **No `@dayflow/shared` changes.** `SalaryStructureSchema` and `PayrollListQuerySchema`
  already covered everything needed; the list-query + pagination merge lives locally in
  `payroll.schema.ts` (module-level composition, not a shared-contract change).
- **Verification note (S04 not done yet):** `requireAuth`/`requireRole` are still S03
  stubs that unconditionally throw `401`, so no curl-based acceptance criterion could be
  run end-to-end with real tokens/roles. See `build/logs/S08-log.md` for exactly what was
  verified instead (direct calls to `payroll.calc.ts`/`payroll.service.ts` against the
  real seeded Postgres, plus a route-wiring smoke test confirming all 5 routes 401
  correctly instead of 404/500). **Unblocks:** S09 (audit hook to wire), S15 (payroll UI
  can build against these exact response shapes) — both still also need S04 for real auth.

### S07 — Leave module (DONE)
- **Router:** `apps/api/src/modules/leave/leave.routes.ts` exports `leaveRouter`,
  mounted at `/leaves` in `apps/api/src/routes/index.ts` (replaced S03's TODO
  comment for S07). Endpoints, all `requireAuth` + `requireRole` (ADMIN/HR where
  noted) per docs/API.md §4 / ADR-006 / ADR-018:
  - `POST /leaves` (self) — apply for leave. Body per `ApplyLeaveSchema`
    (`@dayflow/shared`, field is `type` not `leaveType` — matches the existing
    shared schema/API.md, the session file's own wording was imprecise). Accepts
    `multipart/form-data` with a `file` field (stored under
    `apps/api/uploads/leave-attachments/`, gitignored) **or** a JSON
    `attachmentUrl`; an uploaded file wins if both are present. → `201`.
  - `GET /leaves/me` (any role) — caller's own history, cursor-paginated
    (`nextCursor` in `meta`).
  - `GET /leaves` (ADMIN/HR) — all leave requests, optional `?status=`, cursor
    pagination, includes `{ employee: { firstName, lastName } }`.
  - `PATCH /leaves/:id/approve` (ADMIN/HR) — atomic (see below). → `200`.
  - `PATCH /leaves/:id/reject` (ADMIN/HR) — body `{ reason }` (`RejectLeaveSchema`,
    min 5 chars). → `200`.
  - `GET /leaves/balance/me` (any role) — `{ PAID, SICK, CASUAL }` each
    `{ allocated, used, remaining }` for the current calendar year. `UNPAID` is
    omitted (unlimited, ADR-004).
  - `POST /leaves/allocations` (ADMIN/HR, ADR-018) — body `AllocateLeaveSchema`
    (`{ employeeId, type, totalAllowed, year? }`, year defaults to current year).
    Upserts `LeaveBalance` by `[employeeId, leaveType, year]`; a re-allocation sets
    `totalAllowed` and never resets `used`. → `201`.
- **Service (`leave.service.ts`), all exported:**
  - `countWorkingDays(startDate: Date, endDate: Date): number` — pure helper, UTC
    date-only, inclusive, skips Sat/Sun. S12/S14/S08 can reuse this directly.
  - `applyLeave`, `listMyLeaves`, `listAllLeaves`, `approveLeave`, `rejectLeave`,
    `getMyBalance`, `allocateBalance`.
  - **Balance validation:** skipped entirely for `UNPAID`; for `PAID`/`SICK`/
    `CASUAL`, looked up by `[employeeId, type, year]` where `year` =
    `startDate.getUTCFullYear()` (not "this year" — lets a leave request booked
    near year-end validate against the balance for the year it actually falls
    in). Insufficient balance → `AppError(422, 'INSUFFICIENT_LEAVE_BALANCE', ...)`.
  - **Overlap:** any existing `PENDING`/`APPROVED` leave for the same employee
    whose range intersects the new one (regardless of leave type) →
    `AppError(409, 'LEAVE_OVERLAP', ...)`.
  - **Atomic approve (ADR-006):** `prisma.$transaction` re-fetches the leave,
    re-checks `status === 'PENDING'` (else `AppError(409, 'LEAVE_NOT_PENDING', ...)`
    — also used by reject), updates `status`/`reviewedById`/`reviewedAt`, and (for
    balance-tracked types only) increments `LeaveBalance.used` by `totalDays` in
    the same transaction.
  - `resolveEmployeeId(userId)` (private) maps the authenticated `User.id` →
    `Employee.id` via `prisma.employee.findUnique({ where: { userId } })` — every
    other backend module needing "current employee from `req.user`" will need
    the same lookup; not yet centralized anywhere shared.
- **S09 hook:** `apps/api/src/modules/leave/leave.hooks.ts` exports
  `notifyLeaveDecision(event: { employeeId, leaveId, status: 'APPROVED'|'REJECTED', reason? }): void`
  — a no-op today (`// TODO(S09): emit SSE event + create in-app Notification + AuditLog`).
  Called by `leave.service.ts` after a successful approve/reject.
- **Types:** `leave.types.ts` exports `BALANCE_TRACKED_LEAVE_TYPES`,
  `BalanceTrackedLeaveType`, `isBalanceTracked(type)`, `LeaveBalanceLine`,
  `LeaveBalanceSummary`.
- **No `@dayflow/shared` changes needed** — `ApplyLeaveSchema`, `RejectLeaveSchema`,
  `ApproveLeaveSchema`, `AllocateLeaveSchema`, `LeaveListQuerySchema` (S02) already
  covered every input this session needed; not a shared-contract change.
- **New dependency:** `apps/api` added `multer@^2.2.0` (+ `@types/multer` dev dep)
  for the multipart attachment upload — the 1.x line is deprecated/vulnerable, so
  this pins to the patched 2.x major. `apps/api/uploads/` is gitignored (runtime
  file storage, not committed).
- **Verification note:** S04 (auth) is still stub-only, so none of this could be
  curl-tested end-to-end with a real bearer token. Verified instead by calling
  `leave.service.ts` functions directly against the real seeded Postgres (balance
  math, overlap, atomic approve, allocation upsert, `countWorkingDays`) — see
  `build/logs/S07-log.md` for exactly what was/wasn't verified this way.
- Unblocks: S14 (attendance + leave pages) can build against these endpoints now
  (still blocked on real tokens until S04 lands). S09 can wire `notifyLeaveDecision`
  once it exists.

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
- **S14 (frontend infra, affects S11/S12/S13/S15):** `@dayflow/shared` exports its ESM
  **source** (`./src/index.ts`) which uses explicit `.js` import specifiers that resolve
  to `.ts` files. S10 only imported *types* from shared, so this never surfaced. The
  moment you import a **runtime value** (a Zod schema, `API_ROUTES`, an enum array) from
  `@dayflow/shared` in `apps/web`, `next build` fails with `Module not found: Can't
  resolve './xxx.schema.js'`. Fix already applied in `apps/web/next.config.mjs` — a
  webpack `resolve.extensionAlias` mapping `.js → [.ts,.tsx,.js,.jsx]`. Keep it; it
  unblocks every frontend session that needs shared schemas/constants at runtime. (Dev
  mode / tsx were already fine; only the webpack production build needed it.)
- **S07:** the shared local Postgres had no migrations applied yet when this session
  started (`Company` table didn't exist) despite being reported healthy — ran
  `npm run db:deploy -w @dayflow/db` (`prisma migrate deploy`, safe/non-interactive)
  then `npm run db:seed` before any leave work could be verified. If another
  parallel session hits `P2021 table does not exist`, that's why — just run the same
  two commands once. Also: `apps/api/.env` isn't picked up by root-level
  `npm run db:*` scripts (they need `DATABASE_URL` in the shell env directly, since
  those proxy straight to `prisma` without `tsx --env-file`).

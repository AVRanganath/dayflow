# S05 — Employee & Department Module

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S05-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/employee/*` + `apps/api/src/modules/department/*`.
  **Produces:** the employee directory + self-profile endpoints and the department
  list every dashboard/profile page consumes.
- **Depends on:** S03 (API core). **Parallelizable with:** S04, S06, S07, S08 (they
  touch disjoint module folders). Uses `requireAuth`/`requireRole` from
  `middleware/auth.ts` — a stub until S04 lands (see Preconditions).

## Goal
Implement the employee + department modules end-to-end following the layered
architecture (`route → controller → service → prisma`): **admin employee creation
with auto-generated loginId + temp password (ADR-012)**, admin directory with
pagination/search/department filter (surfacing the computed **workStatus**, ADR-017),
self-profile read + restricted self-update, admin full update over the **expanded
ADR-015 profile fields incl. the `managerId` self-relation**, profile-picture upload,
a department list, and the **Company get/update endpoints (ADR-016)**. Enforce
row-level access (an `EMPLOYEE` reads only its own record; `ADMIN`/`HR` read any) in
the service layer.

## Preconditions
- S03 is `DONE` (Express app, error middleware, `sendSuccess`, `validate`, cursor
  pagination helper, env config, Prisma client, `middleware/auth.ts` present).
- `requireAuth`/`requireRole` are importable from `middleware/auth.ts`. If S04 hasn't
  filled them yet, import them anyway (the signatures are fixed in S04's spec); if the
  file is a pure stub, guard your routes and note the dependency in your log — do not
  reimplement auth.
- `@dayflow/shared` exports `UpdateEmployeeSelfSchema`, `UpdateEmployeeAdminSchema`,
  `CreateEmployeeSchema`, `EmployeeListQuerySchema`, and `UpdateCompanySchema` (from
  S02). If missing, add them to shared and note it.
- You are on latest `main`; `npm install` works; DB is migrated + seeded (S01).

## Deliverables (exact files)
- `apps/api/src/modules/employee/employee.route.ts` — mounts under
  `/api/v1/employees`; all routes behind `requireAuth`; admin routes behind
  `requireRole(['ADMIN','HR'])`; `validate(...)` at each write boundary.
- `apps/api/src/modules/employee/employee.controller.ts` — thin: parse req →
  service → `sendSuccess`. No Prisma.
- `apps/api/src/modules/employee/employee.service.ts` — `createEmployee` (ADR-012:
  auto-generate `loginId` + temp password, create `User`+`Employee`+default
  `LeaveBalance` rows in **one transaction**), list (cursor pagination, `search` over
  name/email, `departmentId` filter, each row carrying the computed `workStatus`),
  `getMe`, `updateMeSelf` (restricted fields only), `getById`, `updateByIdAdmin` (the
  expanded ADR-015 fields incl. `managerId` self-relation), `setProfilePicture`, plus
  the **row-level access check** helper.
- `apps/api/src/lib/login-id.ts` — pure, **unit-tested** `generateLoginId()` (ADR-012:
  `prefix + first-two-of-first + first-two-of-last + join-year + 4-digit serial`,
  uppercased). Owned here (auth in S04 only consumes credentials). Also a small temp
  password generator.
- `apps/api/src/lib/work-status.ts` *(or reuse an S06 attendance helper)* — derives
  `workStatus` (`PRESENT|ABSENT|ON_LEAVE`, ADR-017) from today's `Attendance` +
  approved `LeaveRequest`; not stored. If S06 owns the canonical helper, import it and
  note the dependency; otherwise a minimal local version is fine.
- `apps/api/src/modules/company/*` *(tiny settings module — or fold into employee)* —
  `GET /api/v1/company` (any auth) + `PUT /api/v1/company` (ADMIN-only), ADR-016.
- `apps/api/src/modules/department/department.route.ts` — `GET /api/v1/departments`
  behind `requireAuth`.
- `apps/api/src/modules/department/department.controller.ts` — thin controller.
- `apps/api/src/modules/department/department.service.ts` — list departments.
- `apps/api/src/lib/upload.ts` *(if not provided by S03)* — multer (or equivalent)
  config for `multipart/form-data` single-`file`; local disk/`/uploads` in dev,
  returns a URL string. Keep minimal.
- `apps/api/src/modules/employee/employee.test.ts` *(optional)* — row-level access
  check + restricted-field filtering.

### Endpoints (docs/API.md §2)
- `POST /api/v1/employees` — **ADMIN/HR** (ADR-012). Auto-generates the `loginId`
  (via `generateLoginId`) and a **temp password** (bcrypt-hashed; the plaintext is
  **returned once** to the creator and/or emailed via the ADR-003 notifier), sets
  `mustChangePassword=true`, and creates `User` + `Employee` + default `LeaveBalance`
  rows for `PAID/SICK/CASUAL` in **one Prisma transaction**. `201`.
- `GET /api/v1/employees` — **ADMIN/HR** (ADR-001); cursor-paginated (`cursor`,
  `limit` default 20), `search` (name/email), `departmentId` filter. Each row includes
  the computed `workStatus` (ADR-017). Envelope + `meta.nextCursor`. `200`.
- `GET /api/v1/employees/me` — any authenticated role; returns the caller's own
  `Employee` (joined from `req.user.employeeId`). `200`.
- `PUT /api/v1/employees/me` — self-update **limited to the ADR-015 self-editable
  subset** (`address`, `phone`, `personalEmail`, `profilePicture`, resume fields);
  any other field in the body is rejected/ignored per `UpdateEmployeeSelfSchema`. `200`.
- `GET /api/v1/employees/:id` — **ADMIN/HR** full record; an `EMPLOYEE` hitting this
  for another id → `403 FORBIDDEN` (row-level). `200`.
- `PUT /api/v1/employees/:id` — **ADMIN/HR**; all editable fields incl. the expanded
  ADR-015 set (`firstName`, `lastName`, `departmentId`, `designation`, `employmentType`,
  `maritalStatus`, `nationality`, `panNumber`, `uanNumber`, `employeeCode`,
  `workingDaysPerWeek`, bank details, and **`managerId`** self-relation). Validate
  `managerId` refers to a real employee and reject self-referential cycles. `200`.
- `PATCH /api/v1/employees/:id/profile-picture` — **multipart**; ADMIN/HR, **or self
  when `:id` matches `req.user.employeeId`**; stores file, returns
  `{ profilePictureUrl }`. `200`.
- `GET /api/v1/departments` — any authenticated role; list of `{ id, name }`. `200`.
- `GET /api/v1/company` — **any auth** (ADR-016); returns the single `Company`
  (name, logo, prefix, settings). `200`.
- `PUT /api/v1/company` — **ADMIN-only** (ADR-016); updates name/logo/settings via
  `UpdateCompanySchema`. `200`.

## Implementation notes
- **Row-level access** lives in the service, not the controller: a single helper
  `assertCanAccessEmployee(reqUser, targetEmployeeId)` → throws `403` unless the
  caller is ADMIN/HR or the target is their own record. Reuse it in `getById` and the
  self-scoped profile-picture path.
- **Restricted self-update** is enforced by the Zod schema (`UpdateEmployeeSelfSchema`
  = the ADR-015 self-editable subset `{ address?, phone?, personalEmail?,
  profilePicture?, resume fields? }`, `.strict()`), so an employee physically cannot
  set `designation`/`departmentId`/`managerId`/bank/PAN via `/me`. Admin edits all via
  `PUT /:id`. Do not trust the client.
- **Employee creation (ADR-012).** `generateLoginId()` is a pure, **unit-tested**
  helper owned here; the temp password is random, bcrypt-hashed, `mustChangePassword=true`,
  and the plaintext is returned exactly once (never stored plaintext, never re-returned).
  Serial numbering is per company + join-year; do the create in one transaction with
  the default `LeaveBalance` rows so a partial employee never exists.
- **workStatus (ADR-017)** is computed server-side (never stored) from today's
  `Attendance` + approved `LeaveRequest`; expose it on list/card responses. Reuse the
  S06 attendance helper if available, else a minimal local derivation.
- **managerId** is a self-relation on `Employee`; on admin update, verify the target
  exists and reject cycles (an employee cannot be its own manager).
- **Search** is case-insensitive over `firstName`, `lastName`, `email`; combine with
  the `departmentId` filter as an AND.
- **Cursor pagination** uses the S03 helper (id-based cursor, stable `orderBy`).
- Never return `passwordHash` (it lives on `User`, not `Employee`, so joins must be
  explicit and exclude it).
- **ADR-010** envelope on every response; **ADR-001** — "Admin" in docs/API.md means
  ADMIN **or** HR here. Keep controllers thin; all Prisma in the service.

## Acceptance criteria
Run and confirm each (api on **:8000**, base path `/api/v1`; get tokens via S04
signin — an ADMIN and an EMPLOYEE — into `$AT` / `$ET`):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Create employee (ADR-012):** `POST /employees` as ADMIN/HR returns `201` with a
      well-formed `loginId` (e.g. `OIJODO20220001`) and a one-time temp password;
      `User`+`Employee`+default `LeaveBalance` rows all exist; the temp user signs in
      by that `loginId` (S04) and has `mustChangePassword=true`. An EMPLOYEE calling it
      → `403`. `generateLoginId` has passing unit tests.
- [ ] **List (admin):** `curl -s localhost:8000/api/v1/employees -H "Authorization: Bearer $AT"`
      returns `200`, `success:true`, a `data` array (each row carrying `workStatus`,
      ADR-017) and `meta.nextCursor`.
- [ ] **Paginate + search + filter:** `?limit=5`, `?search=john`, and
      `?departmentId=<id>` each narrow results and still return the envelope with
      `meta`.
- [ ] **Me:** `curl -s localhost:8000/api/v1/employees/me -H "Authorization: Bearer $ET"`
      returns the caller's own profile (matching `employeeId`).
- [ ] **Restricted self-update:** `PUT /employees/me` with `{"phone":"999"}` succeeds
      (`200`); the same call including `{"designation":"CEO"}` is rejected
      (`400 VALIDATION_ERROR`) or the field is not persisted.
- [ ] **Admin update:** `PUT /employees/:id` as ADMIN with `{"designation":"Lead"}`
      returns `200` and persists; setting `managerId` to a valid employee persists, and
      a self-referential `managerId` is rejected (ADR-015).
- [ ] **Cross-employee read blocked:** `GET /employees/:otherId` as EMPLOYEE → `403`.
- [ ] **Departments:** `curl -s localhost:8000/api/v1/departments -H "Authorization: Bearer $ET"`
      returns `200` with the seeded departments.
- [ ] **Company (ADR-016):** `GET /company` (any auth) returns the seeded `"Odoo India"`
      row; `PUT /company` as ADMIN persists a name/settings change and as EMPLOYEE → `403`.
- [ ] Scope check: only `apps/api/src/modules/employee/*`,
      `apps/api/src/modules/department/*`, `apps/api/src/modules/company/*`,
      `lib/upload.ts`, and `lib/login-id.ts` (+ `lib/work-status.ts` if added) were
      touched (plus shared schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S05 → `DONE`; under "Interfaces produced (detail)" list the
  seven endpoints, the `GET /departments` route, the restricted self-update field set,
  and the `assertCanAccessEmployee` row-level rule (so S12/S13 web pages know the
  contract). Note the upload URL shape.
- `build/logs/S05-log.md`: from `_TEMPLATE.md` — record the pagination cursor format,
  the upload/storage choice, and any deviation.

## ▶ Copy-paste prompt
```
You are running build session S05 (Employee & Department Module) for the Dayflow HRMS
monorepo. This is a fresh chat with no prior memory — all context lives in committed
files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S05-employee.md (your full spec). Also read docs/API.md §2 and the
   ADR entries it references (ADR-001, 010, and the design-board decisions ADR-012
   employee-create/loginId, ADR-015 expanded profile + managerId, ADR-016 company,
   ADR-017 workStatus).
2. Verify the preconditions (S03 DONE; requireAuth/requireRole importable; shared
   employee schemas exist). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s05-employee, build ONLY the
   Deliverables listed in the session file, run every Acceptance criteria command and
   confirm it passes, then update build/STATE.md and write build/logs/S05-log.md, and
   commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S13 directory/profile
   pages), and the next session to run.

Stay strictly in scope — employee + department modules only; do not reimplement auth.
When the spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

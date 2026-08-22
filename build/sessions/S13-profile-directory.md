# S13 — Profile & Employee Directory Pages

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S13-log.md` and commit before you finish.

- **Owns:** `apps/web/app/(app)/profile/*` and `apps/web/app/(app)/employees/*`
  (PAGE 5 + PAGE 6 in `docs/UI_DESIGN_PROMPT.md`). **Produces:** the employee
  self-service profile (view + limited edit + picture upload) and the admin
  employee directory (search, filter, paginated table).
- **Depends on:** S10 (web foundation: Next 14 scaffold, Tailwind design system,
  `apiClient`, auth context/session, shared UI components, app shell/sidebar) and
  S05 (employee & department API endpoints). **Parallel with:** S11, S12, S14, S15
  (disjoint files under `apps/web/app/(app)/`).

## Goal
Build the two employee-data pages against the real API following
`docs/UI_DESIGN_PROMPT.md` PAGE 5 and PAGE 6. Employees can view their full profile
and edit only the allowed personal fields; profile picture uploads via multipart.
Admins/HR get a searchable, filterable, paginated directory. Reuse S10's design
system and app shell — no new global chrome. No API changes.

## Preconditions
- S10 is `DONE` in `build/STATE.md` (Next 14 App Router scaffold on port **3000**,
  Tailwind + design tokens from the UI spec, `@dayflow/web`'s `apiClient` with
  auth/refresh wired, auth/session context exposing the current user + role, and the
  shared app shell: dark plum sidebar, header bar, Avatar, StatusBadge, DataTable,
  Modal, form fields, EmptyState, Toast — the reusable components in the UI spec §
  "Reusable Components Needed"). If any are missing, stop and report.
- S05 is `DONE`: `GET /employees` (search + `departmentId` filter + cursor
  pagination), `GET /employees/me`, `GET /employees/:id`, `PUT /employees/:id`,
  `PATCH /employees/:id/profile-picture` all live on the api (**:8000**, `/api/v1`).
  Departments are listable (for the filter + department badge/label).
- `@dayflow/shared` exports the employee/department types + the profile-edit Zod
  schema. If a needed schema is missing, add it to shared and note it loudly in your
  log + `STATE.md`.
- You are on latest `main`; `npm install` works; api + web run (`npm run dev`).

## Deliverables (exact files)
- `apps/web/app/(app)/profile/page.tsx` — **PAGE 5**. Profile header (120px circular
  avatar with camera-icon upload overlay, name, designation, department badge,
  Employee ID, "Edit Profile" outline button) + the tab panel below. Loads
  `GET /employees/me`; role-agnostic (any authenticated user). **Tabs must match the
  design board (ADR-015):** Resume, Private Info, Job Details, and — **for ADMIN
  only** (ADR-013) — Salary Info. The Salary Info tab is not rendered for non-admin
  users.
- `apps/web/app/(app)/profile/_components/resume-tab.tsx` — **Resume tab** (ADR-015):
  About, "What I love about my job", Interests & Hobbies, Skills, Certification. These
  are the optional Resume fields (`about`, `whatILove`, `hobbies`, `skills`,
  `certifications`); self-editable where present. If a field/endpoint is absent, render
  it read-only/empty and note it — do **not** invent an endpoint.
- `apps/web/app/(app)/profile/_components/private-info-tab.tsx` — **Private Info tab**
  (ADR-015): Date of Birth, Residing Address, Personal Email, Gender, Nationality,
  Marital Status, PAN No, UAN No, Emp Code, and **Bank Details** (Account Number, Bank
  Name, IFSC). **Editable-limited:** only the allowed personal fields (address,
  personal email, etc. per ADR-015) are editable; restricted fields (IDs, PAN/UAN, Emp
  Code) render locked (lock icon + gray background, `disabled`). "Save Changes" is
  enabled only for editable fields and calls `PUT /employees/me`. Client-validate with
  the shared Zod schema.
- `apps/web/app/(app)/profile/_components/job-details-tab.tsx` — **Job Details tab**
  (ADR-015), all read-only for employees: Department, Manager (reporting manager),
  Company, Job Position (designation), Date of Joining, and working-days/week
  (`workingDaysPerWeek`).
- `apps/web/app/(app)/profile/_components/salary-info-tab.tsx` — **Salary Info tab**,
  **ADMIN-only** (ADR-013). Read-only component breakdown (Basic, HRA, Standard
  Allowance, Performance Bonus, LTA, Fixed Allowance; PF employee/employer, Professional
  Tax) with Gross / Total Deductions / Net highlighted, INR formatted per ADR-008.
  (Data from `GET /employees/me` if present, else render the read-only structure from
  the profile payload; do **not** call payroll edit APIs — that's S15.)
- `apps/web/app/(app)/profile/_components/avatar-upload.tsx` — the camera-overlay
  uploader: pick/preview an image, `PATCH /employees/:id/profile-picture` as
  `multipart/form-data` (`file` field) with `:id` = current user's id, then refresh
  the header from the returned `profilePictureUrl`. Optimistic + toast on success.
- `apps/web/app/(app)/employees/page.tsx` — **PAGE 6**, **ADMIN/HR only**. Top bar
  ("Employees" + count badge, search input, Department / Employment Type / Status
  filter dropdowns, "Add Employee" button — button may be present but the add flow is
  out of scope; wire only what S05 supports), the directory table, and pagination.
  Server component gate + client interactivity as needed.
- `apps/web/app/(app)/employees/_components/employee-table.tsx` — columns:
  Employee (Avatar + bold name + gray email), ID, Department (badge), Designation,
  Join Date, Status (Active green / Inactive red badge), Actions (View / Edit /
  three-dot). Zebra striping per the UI spec. Rows come from `GET /employees`.
- `apps/web/app/(app)/employees/_components/employee-card.tsx` — **directory card**
  (ADR-017): profile picture + basic info (name, designation, department), with a live
  **work-status icon top-right** — 🟢 green (checked in / present), 🟡 yellow (absent),
  ✈️ airplane (on approved leave today) — driven by the `workStatus`
  (`PRESENT|ABSENT|ON_LEAVE`) field on the employee response. The whole card is
  **clickable → a view-only employee page** (`/employees/:id`, read-only reuse of the
  profile view; no edit controls).
- `apps/web/app/(app)/employees/_components/employee-filters.tsx` — search box
  (debounced) + Department / Employment Type / Status selects; drives the query.
- `apps/web/app/(app)/employees/_components/employee-pagination.tsx` — cursor-based
  pagination wired to `meta.nextCursor` ("Showing X–Y of N" + controls, ADR-010).
- `apps/web/lib/employees.ts` *(or extend S10's api layer)* — typed fetchers:
  `getMe()`, `updateMe(body)`, `uploadProfilePicture(id, file)`, `listEmployees(params)`,
  using `@dayflow/shared` types. No `any`.

## Implementation notes
- **Role-gate the directory.** `/employees` is ADMIN/HR only (ADR-001: "Admin" ⇒
  ADMIN or HR). Enforce in the route (redirect non-management users to `/dashboard`)
  **and** hide the sidebar nav item for employees. Do not rely on hiding alone — the
  route itself must reject. The API is the final gate, but fail fast in the UI.
- **Editable-limited profile.** Employees may edit only personal fields (per the UI
  spec's Personal Details tab); email, role, IDs, department, designation, salary and
  join date are locked. Use `PUT /employees/me` for self-edits; the admin-only
  `PUT /employees/:id` is **not** used here. Persisted changes must survive a reload.
- **Pagination is cursor-based** (ADR-010) — pass `?cursor=`, read `meta.nextCursor`;
  never assume offset pages. `limit` default 20. Search + filters reset the cursor.
- **Envelope + errors (ADR-010).** Every response is `{ success, data, meta? }`;
  surface `error.message` via a toast; render loading + empty states (skeletons are
  polished in S16, but include basic loading/empty here).
- **INR everywhere** salary appears (ADR-008): `₹` + thousands separators.
- Reuse S10 components (Avatar, StatusBadge, DataTable, Modal, form fields, Toast);
  do not fork new versions. Follow `plan.md §6` (strict TS, no `any`, JSDoc on
  exported components, kebab-case files, PascalCase components).
- Stay in scope: only the `profile/` and `employees/` trees + their thin api helper.
  Do not touch dashboards, attendance, leave, payroll, or the shell.

## Acceptance criteria
Run and confirm each (web on **:3000**, api on **:8000**; seed creds from `plan.md`:
Employee `john@dayflow.com`/`Employee@123`, Admin `admin@dayflow.com`/`Admin@123`):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Profile loads:** signed in as the employee, `/profile` renders the header
      (avatar, name, designation, department badge, Employee ID) and the board tabs
      (ADR-015) — Resume, Private Info, Job Details — from real `GET /employees/me`
      data. The **Salary Info tab is present for ADMIN only** and hidden for the
      employee.
- [ ] **Private Info fields:** the Private Info tab shows DOB, Residing Address,
      Personal Email, Gender, Nationality, Marital Status, PAN No, UAN No, Emp Code,
      and Bank Details (Account Number / Bank Name / IFSC).
- [ ] **Limited edit persists:** editing an allowed personal field + "Save Changes"
      calls `PUT /employees/me`, shows a success toast, and the new value is still
      present after a full page reload.
- [ ] **Restricted fields locked:** IDs/PAN/UAN/Emp Code/job/salary fields are visibly
      locked (lock icon + gray, `disabled`) and cannot be submitted.
- [ ] **Picture upload:** using the camera overlay uploads an image via
      `PATCH /employees/:id/profile-picture` (multipart) and the header avatar updates
      to the returned URL.
- [ ] **Directory (admin):** signed in as admin, `/employees` lists real employees
      with avatar/name/email/ID/dept/designation/join date/status; search by name/ID
      filters the list; department/employment-type/status filters narrow it.
- [ ] **Directory cards + status (ADR-017):** cards show profile picture + basic info
      with the correct work-status icon top-right (🟢/🟡/✈️) from `workStatus`, and
      clicking a card opens the view-only employee page (`/employees/:id`, no edit
      controls).
- [ ] **Pagination:** advancing pages uses `meta.nextCursor` and shows the correct
      "Showing X–Y of N".
- [ ] **Role gate:** signed in as the employee, navigating to `/employees` is
      rejected (redirected to `/dashboard`) and the nav item is not shown.
- [ ] Scope check: only files under `apps/web/app/(app)/profile/**`,
      `apps/web/app/(app)/employees/**`, and the employees api helper were touched
      (plus shared schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S13 → `DONE`; under "Interfaces produced (detail)" note the
  routes added (`/profile`, `/employees`, `/employees/:id` view-only), the api helpers
  exported from `lib/employees.ts`, the role-gate pattern used (incl. the ADMIN-only
  Salary Info tab), the work-status icon source (`workStatus`), and any shared schema
  you added. Note whether the Resume-tab fields were found or stubbed.
- `build/logs/S13-log.md`: from `_TEMPLATE.md` — record which profile fields you
  treated as editable vs locked, the Resume-tab decision, and any deviation.

## ▶ Copy-paste prompt
```
You are running build session S13 (Profile & Employee Directory pages) for the
Dayflow HRMS monorepo. This is a fresh chat with no prior memory — all context lives
in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S13-profile-directory.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md PAGE 5 + PAGE 6 and docs/API.md §2, plus ADR-001, 008, 010,
   013, 015, 017.
2. Verify the preconditions (S10 DONE — web foundation/design system/apiClient/auth;
   S05 DONE — employee endpoints). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s13-profile-directory, build
   ONLY the Deliverables listed in the session file, run every Acceptance criteria
   check and confirm it passes, then update build/STATE.md and write
   build/logs/S13-log.md, and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked, and the next session
   to run.

Stay strictly in scope — the /profile and /employees pages only; reuse S10's design
system and app shell; make no API changes. Follow docs/UI_DESIGN_PROMPT.md precisely.
When the spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

# Design Decisions (ADRs)

> **Multi-agent note.** This file is the **authoritative tie-breaker.** When the
> spec (`Dayflow.pdf`), `API.md`, `ARCHITECTURE.md`, and the Prisma schema disagree,
> the decision recorded here wins. If you hit an unresolved conflict, make the
> smallest reasonable call, **add an entry here**, and note it in your session log so
> it becomes durable for the next agent. Newest decisions at the bottom.

Format: one numbered decision — context, decision, consequence.

---

### ADR-001 — Roles: `ADMIN`, `HR`, `EMPLOYEE`
**Context.** The spec calls the privileged user "Admin / HR Officer" and lets signup
pick `Employee` or `HR`. The initial Prisma enum only had `ADMIN` and `EMPLOYEE`.
**Decision.** `Role = { ADMIN, HR, EMPLOYEE }`. `ADMIN` and `HR` are both
"management" (can view all, approve leave, edit employees, manage payroll). `ADMIN`
is the superset (can manage HR users, system settings). **Self-signup may create
`EMPLOYEE` or `HR` only**; the first `ADMIN` is created by the seed.
**Consequence.** S01 adds `HR` to the enum. RBAC helper `requireRole(['ADMIN','HR'])`
guards management routes. `docs/API.md` "Admin" auth notes mean "ADMIN or HR" unless
it explicitly says ADMIN-only (payroll edits, role changes are ADMIN-only).

### ADR-002 — Signup payload  ⚠️ REVISED by ADR-012
**Context.** Spec signup fields = Employee ID, Email, Password, Role. `API.md` showed
`email, password, firstName, lastName`.
**Decision.** Canonical signup body:
`{ employeeId, email, password, firstName, lastName, role: 'EMPLOYEE'|'HR' }`.
Creating a `User` also creates its linked `Employee` row in one transaction.
**⚠️ Superseded in part:** the design board (`Human Resource Management System` SVG)
says **normal users cannot self-register** — employees are created by Admin/HR and
receive a system-generated Login ID + password. The public `signup` endpoint is now
**company/admin onboarding only**. See **ADR-012** for the authoritative flow. This
signup *body shape* is still reused by the admin employee-creation endpoint.
**Consequence.** S02 encodes the schema; S04 implements per ADR-012; S04 aligns `API.md` §1.

### ADR-003 — Email verification is non-blocking in dev
**Context.** Spec requires email verification, but the hackathon demo has no SMTP.
**Decision.** Generate a verification token and a `GET /auth/verify-email/:token`
endpoint. Email delivery goes through a **pluggable notifier** (`console` provider in
dev that logs the link; real provider optional). In `NODE_ENV=development` the seed
and signup mark demo users `isEmailVerified=true` so login works instantly. Unverified
login is allowed in dev but flagged; production can enforce it via a flag.
**Consequence.** Demo never blocks on email. S04 + S09 own this.

### ADR-004 — Canonical leave types & balances
**Context.** Schema had `PAID,SICK,UNPAID,CASUAL,MATERNITY,PATERNITY`; `API.md` used
`SICK,CASUAL,ANNUAL`; spec says `Paid,Sick,Unpaid`.
**Decision.** Canonical `LeaveType = { PAID, SICK, CASUAL, UNPAID, MATERNITY,
PATERNITY }`. "Annual" ≡ `PAID`. **Balances are tracked for `PAID`, `SICK`, `CASUAL`**
(the UI's three balance cards). `UNPAID` is unlimited (no balance check).
`MATERNITY`/`PATERNITY` exist for completeness, no balance card in MVP.
**Consequence.** S02 enum + S07 balance logic follow this; S07 agent aligns `API.md` §4.

### ADR-005 — Attendance status enum
**Decision.** `AttendanceStatus = { PRESENT, ABSENT, HALF_DAY, ON_LEAVE }`. UI label
"Leave" maps to `ON_LEAVE`. Matches the existing Prisma schema — no change needed.

### ADR-006 — Leave approve/reject endpoints
**Context.** `ARCHITECTURE.md` mentioned `PUT /leaves/:id/status`; `API.md` uses two
verbs.
**Decision.** Canonical: `PATCH /api/v1/leaves/:id/approve` and
`PATCH /api/v1/leaves/:id/reject` (reject requires `{ reason }`). Approval sets
`status`, `reviewedById`, `reviewedAt`, decrements the matching `LeaveBalance`, and
fires a notification (S09). **Balance decrement + status change happen in one Prisma
transaction.**
**Consequence.** S07 implements; ignore the `PUT /status` phrasing in ARCHITECTURE.

### ADR-007 — Token delivery
**Decision.** `accessToken` (JWT, 15 min) returned in the JSON body; client holds it
in memory. `refreshToken` (7 days) set as an **HttpOnly, `SameSite=Strict`, `Secure`
in prod** cookie. `POST /auth/refresh` reads the cookie (not the body). On logout the
cookie is cleared and the token is blacklisted in Redis. `API.md` JSON snippets that
show `refreshToken` inline are illustrative; the cookie is authoritative.
**Consequence.** S04 implements; web (S10/S11) relies on the cookie + `/refresh`.

### ADR-008 — Currency is INR (₹)
**Decision.** All salary/payroll amounts are Indian Rupees, formatted `₹` with
thousands separators, matching `docs/UI_DESIGN_PROMPT.md`. Ignore the `USD` sample in
`API.md`. Payroll math and payslip PDF use INR.

### ADR-009 — Realtime via SSE + Redis pub/sub
**Decision.** "Reflects immediately" (spec 3.5.2) is implemented with Server-Sent
Events at `GET /api/v1/events` (auth required), backed by Redis pub/sub so it works
across horizontally-scaled API instances. Chosen over WebSockets for simplicity
(one-way server→client is all the MVP needs). S09 owns it.

### ADR-010 — IDs are UUID strings; API envelope is fixed
**Decision.** All primary keys are UUID `String`s (Prisma default). Every response
uses the envelope in `docs/API.md`: success `{ success:true, data, meta? }`, error
`{ success:false, error:{ code, message, details? } }`. List endpoints use
cursor-based pagination. No endpoint returns a raw array or bare object.

### ADR-011 — Notification model (added by S09)
**Context.** The schema has `AuditLog` but no in-app notification store, which the
realtime/notification differentiator (`plan.md §2`) needs.
**Decision.** S09 adds a `Notification` Prisma model — a shared-contract change that
S09 must announce in `build/STATE.md` "Blockers/notes" and its log. Canonical shape:
`Notification { id (uuid), userId (FK→User, cascade), type (String, e.g.
'LEAVE_APPROVED'), title (String), body (String), isRead (Boolean @default(false)),
createdAt (DateTime @default(now())) }` with `@@index([userId, isRead])` and the
`User ||--o{ Notification` relation. Endpoints: `GET /api/v1/notifications/me`,
`PATCH /api/v1/notifications/:id/read`.
**Consequence.** `notify()` writes a `Notification`, publishes the SSE event
(ADR-009), and optionally emails (ADR-003). Because it changes the schema, any
in-flight backend session should rebase after S09 merges.

---

## Design-board reconciliation (ADR-012 … ADR-019)

> These decisions capture the detailed design board
> (`Human Resource Management System - 8 hours.svg`, the Excalidraw the team drew).
> Where the board and the PDF conflict, **the board wins** — it is the more detailed,
> more recent plan. These enrich the data model and flows; treat them as authoritative.

### ADR-012 — Employee creation & auto-generated Login ID (supersedes ADR-002 self-signup)
**Context.** Board note: *"Normal user cannot register. When the HR officer or Admin
creates a new user/employee, their ID should also be created by this method. Their
password should be auto-generated for the first time by the system. They can login and
change the system-generated password."*
**Decision.**
- **Public `POST /auth/signup` is company/admin onboarding only.** It creates the first
  `ADMIN` user **and** the `Company` (name + logo, see ADR-016). It is allowed only
  while no `ADMIN` exists (bootstrap); afterwards it returns `403 REGISTRATION_CLOSED`.
- **Employees/HR are created by Admin/HR** via `POST /api/v1/employees` (ADMIN/HR).
  The server **auto-generates** the Login ID and a temporary password (returned once to
  the creator and/or emailed via the ADR-003 notifier). `mustChangePassword=true` until
  the user changes it via `POST /auth/change-password`.
- **Login** accepts email **or** Login ID + password.
- **Login ID format (`loginId`):** `OI` + first two letters of first name + first two
  letters of last name (uppercased) + 4-digit year of joining + 4-digit zero-padded
  serial for that year. Example **`OIJODO20220001`** = `OI` (Odoo India / company) +
  `JODO` (John Doe) + `2022` (join year) + `0001` (first joiner that year).
  The company prefix comes from the `Company` (configurable; default `OI`).
**Consequence.** Add `loginId` (unique) and `mustChangePassword` to `User`/`Employee`;
add a `generateLoginId()` helper (unit-tested). S01 schema, S02 schema, S04 auth +
S05 employee-create own this. The 3.1.1 PDF "self sign-up" is **not** implemented for
regular employees.

### ADR-013 — Salary structure & components (Indian payroll model; replaces old payroll columns)
**Context.** The board's Salary Info tab defines a specific component-based structure,
not the earlier `conveyance/medical/special/incomeTax` columns.
**Decision.** A per-employee **SalaryStructure** is defined from a monthly **Wage**.
Each **earning component** has a `computationType` (`FIXED` amount or `PERCENTAGE`) and
a value; amounts **auto-compute from Wage** and update when Wage changes. The total of
all components must equal the Wage (Fixed Allowance is the balancer). Canonical
components and default rules:
| Component | Rule (default) | Example @ Wage ₹50,000 |
|-----------|----------------|------------------------|
| Basic Salary | 50% of Wage | 25,000 |
| House Rent Allowance (HRA) | 50% of Basic | 12,500 |
| Standard Allowance | fixed / configured | 4,167 |
| Performance Bonus | 8.33% of Basic | 2,082.50 |
| Leave Travel Allowance (LTA) | 8.33% of Basic | 2,082.50 |
| Fixed Allowance | **Wage − sum(all above)** (balancer) | remainder |
**Deductions:**
- **Provident Fund (PF):** employee 12% of Basic **and** employer 12% of Basic. Only
  the *employee* share is deducted from take-home; employer share is CTC only.
- **Professional Tax:** fixed ₹200 / month, deducted from gross.
Gross = sum(earning components) (= Wage). Net (take-home) = Gross − employeePF −
professionalTax, then **prorated by payable days** (ADR-014). All INR (ADR-008), stored
as `Decimal`. Rates (PF %, Prof. Tax, component %s) are configurable per ADR-016.
**Consequence.** Replace `PayrollRecord` allowance/deduction columns with this model
(see DATABASE.md). Salary math lives in a pure, unit-tested `computeSalary(wage, cfg)`.
S01 schema, S08 backend, S15 UI own this. Salary Info tab is **Admin-only** (board note).

### ADR-014 — Attendance-driven payslip (payable days)
**Context.** Board: *"Attendance data serves as the basis for payslip generation. Any
unpaid leave or missing attendance days should automatically reduce the number of
payable days during payslip computation."*
**Decision.** For a pay month: `payableDays = workingDaysInMonth − unpaidLeaveDays −
missingAttendanceDays` (approved PAID/SICK leave still counts as payable; only `UNPAID`
leave and unexcused absences reduce it). `netSalary = round(monthlyNet ×
payableDays / workingDaysInMonth)`. `workingDaysInMonth` derives from the employee's
**working-days-per-week** setting (default 5, Mon–Fri) minus company holidays (holidays
optional in MVP). Payslip lists earnings, deductions, payable days, and net.
**Consequence.** S08 generates payslips from Attendance + LeaveRequest + SalaryStructure.
`PayrollRecord` stores the computed snapshot per `[employeeId, month, year]`.

### ADR-015 — Expanded employee profile fields
**Decision.** `Employee` gains, to match the board's My Profile → Private Info tab:
`personalEmail`, `maritalStatus` (enum `SINGLE|MARRIED|OTHER`), `nationality`,
`panNumber`, `uanNumber` (PF), `employeeCode` (a.k.a. Emp Code; may equal `employeeId`),
`workingDaysPerWeek` (Int, default 5), bank details
`bankAccountNumber`, `bankName`, `bankIfsc`, and a self-relation **`managerId`**
(reporting manager, `Employee?`). Optional "Resume" tab content
(`about`, `whatILove`, `hobbies`, `skills` string[]/JSON, `certifications`) — nice-to-have,
may be a JSON column. `dateOfBirth`, `gender` already exist.
**Consequence.** S01 extends the schema (all new fields nullable/defaulted so migration
is additive). S02 profile schemas + S05 endpoints + S13 UI expose them. Self-editable
set stays limited (ADR: address/phone/personalEmail/picture/resume); Admin edits all.

### ADR-016 — Company & Settings entity
**Context.** Board Settings page: Company Name + Upload Logo; company prefix feeds the
Login ID (ADR-012); PF/tax rates and salary-component defaults are company config.
**Decision.** Add a **`Company`** model: `id, name, logoUrl?, loginIdPrefix (default
"OI"), and a `settings` JSON` (PF employee %, PF employer %, professionalTax,
component default %s, default workingDaysPerWeek). MVP is **single-company** (one row,
seeded). Endpoints: `GET /api/v1/company` (any auth), `PUT /api/v1/company`
(ADMIN-only) for name/logo/settings. `Employee.companyId` FK.
**Consequence.** S01 seeds one Company ("Odoo India", prefix "OI"). S05 (or a small
settings module) exposes it; S16 wires the Settings page. Amounts/rates read from here.

### ADR-017 — Work-status indicator
**Decision.** Each employee shows a live status derived from today's data:
🟢 **green** = checked in / present in office; 🟡 **yellow** = absent (no time-off
applied and not checked in); ✈️ **airplane** = on approved leave today. Expose a
computed `workStatus` (`PRESENT|ABSENT|ON_LEAVE`) on employee list/card responses; the
red→green dot flips on check-in. Derived server-side from `Attendance` + approved
`LeaveRequest`; not stored.
**Consequence.** S06 computes it (used by S12 dashboard cards + S13 directory cards).

### ADR-018 — Time-off allocation & sick-leave attachment
**Decision.** Admin/HR **allocate** leave balances to employees (the board's
"Allocation" — e.g. Paid 24 days, Sick 7 days), via `POST /api/v1/leaves/allocations`
(ADMIN/HR) writing `LeaveBalance` rows. A leave request may carry an **attachment**
(sick-leave certificate): `LeaveRequest.attachmentUrl?`. Apply-leave supports
multipart or a pre-uploaded file URL.
**Consequence.** S01 adds `attachmentUrl?` to `LeaveRequest`; S07 adds the allocation
endpoint + attachment handling; S14 UI adds the upload + admin allocation.

### ADR-019 — Attendance detail: breaks, extra hours, working-days/week
**Decision.** `Attendance` tracks `checkIn`, `checkOut`, `breakMinutes` (default 0),
computed `hoursWorked` (= worked − breaks) and `extraHours` (hours beyond the standard
day). List view (board) shows Date, Check In, Check Out, Work Hours, Extra Hours, Break.
Default view is day-wise for the **current month**. Standard workday length and
working-days/week come from `Employee.workingDaysPerWeek` / company settings (ADR-016).
**Consequence.** S01 adds `breakMinutes` + `extraHours` to `Attendance`; S06 computes
them; S14 shows the columns.

### ADR-020 — Pin Prisma to v6
**Context.** The `schema.prisma` uses the classic `datasource db { url = env("DATABASE_URL") }`
form and validates cleanly on Prisma 6. Prisma 7 (default on a fresh `npx prisma`)
changed datasource/config handling and errors on this schema.
**Decision.** Pin `prisma` and `@prisma/client` to `^6` (a known-good `6.x`) in
`packages/db` (and anywhere Prisma is invoked). Do **not** silently upgrade to 7 during
the hackathon.
**Consequence.** S00 sets the pinned dev/prod deps + commits the lockfile; S01 runs
migrate/generate/seed against Prisma 6. If a future migration to 7 is wanted, it is its
own session with the datasource syntax updated.


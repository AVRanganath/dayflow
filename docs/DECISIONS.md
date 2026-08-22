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

### ADR-002 — Signup payload
**Context.** Spec signup fields = Employee ID, Email, Password, Role. `API.md` showed
`email, password, firstName, lastName`.
**Decision.** Canonical signup body:
`{ employeeId, email, password, firstName, lastName, role: 'EMPLOYEE'|'HR' }`.
Creating a `User` also creates its linked `Employee` row in one transaction.
**Consequence.** S02 encodes this in `SignupSchema`; S04 implements it; the S04 agent
updates `docs/API.md` §1 to match.

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

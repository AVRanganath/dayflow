# S06 — Attendance Module

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S06-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/attendance/*`.
  **Produces:** check-in/check-out, personal attendance history, the admin
  attendance list, the dashboard summary stats, and a computed `workStatus`
  helper (ADR-017) consumed by S12/S13.
- **Depends on:** S03 (API core). **Parallelizable with:** S04, S05, S07, S08 (they
  touch disjoint module folders). Uses `requireAuth`/`requireRole` from
  `middleware/auth.ts` — a stub until S04 lands (see Preconditions).

## Goal
Implement the attendance module end-to-end following the layered architecture
(`route → controller → service → prisma`): daily check-in/check-out with
`breakMinutes`, `hoursWorked` and `extraHours` computation (ADR-019), personal
range queries (daily/weekly/monthly, cursor), an admin list with filters, the
dashboard summary, and a computed `workStatus` helper (ADR-017). Enforce the
`@@unique([employeeId, date])` invariant and the ADR-005 status enum.

## Preconditions
- S03 is `DONE` (Express app, error middleware, `sendSuccess`, `validate`, cursor
  pagination helper, env config, Prisma client, `middleware/auth.ts` present).
- `requireAuth`/`requireRole` are importable from `middleware/auth.ts`. If S04 hasn't
  filled them yet, import them anyway (signatures fixed in S04's spec) and guard your
  routes; note the dependency in your log — do not reimplement auth.
- `@dayflow/shared` exports `CheckInSchema`, `AttendanceMeQuerySchema`,
  `AttendanceListQuerySchema` (from S02). If missing, add them to shared and note it.
- DB is migrated + seeded (S01) so the summary has data to count against.
- You are on latest `main`; `npm install` works; `docker compose up -d` is running.

## Deliverables (exact files)
- `apps/api/src/modules/attendance/attendance.route.ts` — mounts under
  `/api/v1/attendance`; employee routes behind `requireAuth`; admin routes behind
  `requireRole(['ADMIN','HR'])`; `validate(...)` at each write/query boundary.
- `apps/api/src/modules/attendance/attendance.controller.ts` — thin: parse req →
  service → `sendSuccess`. No Prisma.
- `apps/api/src/modules/attendance/attendance.service.ts` — `checkIn`, `checkOut`
  (computes `hoursWorked` and `extraHours` from `checkIn`/`checkOut`/`breakMinutes`,
  ADR-019), `getMine` (range → date window, cursor; default = current-month day-wise),
  `listAll` (filters + cursor), `getSummary` (dashboard aggregates), a **`workStatus`
  helper** (ADR-017) that derives `PRESENT|ABSENT|ON_LEAVE` from today's `Attendance`
  + approved `LeaveRequest` (exported for S12/S13 to consume), plus the today-date helper.
- `apps/api/src/modules/attendance/attendance.test.ts` *(optional)* — double
  check-in → `409`; `hoursWorked`/`extraHours`/break math; `workStatus` correctness;
  summary counts.

### Endpoints (docs/API.md §3)
- `POST /api/v1/attendance/check-in` — creates today's row for
  `req.user.employeeId` with `status=PRESENT`, `checkIn=now`, `date=today`
  (`@db.Date`). **Second check-in the same day → `409 ALREADY_CHECKED_IN`** (the
  unique `[employeeId, date]` guard). Body `{ location, ipAddress }` (ipAddress
  inferred from request if omitted). `201`.
- `POST /api/v1/attendance/check-out` — sets `checkOut=now` on today's row and
  computes `hoursWorked = (checkOut − checkIn) − breakMinutes` in hours (Decimal(5,2))
  and `extraHours` = hours beyond the standard workday (ADR-019); no open row
  today → `409`/`404`; double check-out → `409`. `200`.
- `GET /api/v1/attendance/me` — `range = daily | weekly | monthly` maps to a date
  window ending today; cursor-paginated; returns the caller's rows exposing Date,
  Check In, Check Out, Work Hours, Extra Hours, Break (ADR-019). **Default view =
  current-month day-wise.** `200`.
- `GET /api/v1/attendance` — **ADMIN/HR**; filters `date`, `departmentId`, `status`;
  cursor-paginated; each row includes minimal employee info. `200`.
- `GET /api/v1/attendance/summary` — **ADMIN/HR** dashboard stats for `date`
  (default today): `{ totalEmployees, present, absent, onLeave }`. `200`.

## Implementation notes
- **ADR-005 status enum:** `PRESENT | ABSENT | HALF_DAY | ON_LEAVE`. UI "Leave" ⇒
  `ON_LEAVE`. No schema change — matches Prisma.
- **Date handling:** `date` is a `@db.Date` (midnight, no time). Derive "today" once
  (server tz) and reuse; check-in/out both key off it. Do **not** create duplicate
  rows — rely on the unique constraint and translate its Prisma error to `409`.
- **ADR-019 breaks/extra:** track `breakMinutes` (default 0, from body or later edit).
  `hoursWorked` = `(checkOut − checkIn) − breakMinutes`, in hours, rounded to 2
  decimals; store as Decimal. `extraHours` = `max(0, hoursWorked − standardWorkday)`
  where the standard workday length / working-days-per-week comes from
  `Employee.workingDaysPerWeek` / company settings (ADR-016; pick a sensible default,
  e.g. 8h, and document it). List rows surface Date, Check In, Check Out, Work Hours,
  Extra Hours, Break. Guard against `checkIn` being null.
- **ADR-017 workStatus:** expose a computed, **not-stored** `workStatus`
  (`PRESENT|ABSENT|ON_LEAVE`) derived server-side from today's `Attendance` +
  approved `LeaveRequest`: `PRESENT` = checked in today; `ON_LEAVE` = an approved
  leave covers today; `ABSENT` = no time-off applied and not checked in. Export the
  helper (and include `workStatus` on employee-scoped responses where relevant) so
  S12 dashboard cards + S13 directory cards render 🟢/🟡/✈️ without reimplementing it.
- **Ranges:** `daily` = today; `weekly` = last 7 days; `monthly`/**default** = current
  month day-wise (ADR-019). Document the exact window in the log.
- **Summary counts** for the given date: `present` = rows with `status=PRESENT`,
  `absent` = active employees with no PRESENT/HALF_DAY row that day (or
  `status=ABSENT`), `onLeave` = `status=ON_LEAVE`; `totalEmployees` = count of active
  employees. Define the exact rule in your log so S12's dashboard matches.
- **ADR-010** envelope + cursor `meta` on lists; **ADR-001** — admin routes accept
  ADMIN **or** HR. Keep controllers thin; all Prisma in the service.

## Acceptance criteria
Run and confirm each (api on **:8000**, base path `/api/v1`; get an EMPLOYEE token
`$ET` and an ADMIN token `$AT` via S04 signin):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Check-in:** `curl -s -X POST localhost:8000/api/v1/attendance/check-in -H "Authorization: Bearer $ET" -H 'Content-Type: application/json' -d '{"location":"office"}'`
      returns `201` with `status:"PRESENT"` and a `checkInTime`; today's row now exists.
- [ ] **Double check-in rejected:** repeating the same call returns `409`
      (`ALREADY_CHECKED_IN`), no duplicate row created.
- [ ] **Check-out:** `curl -s -X POST localhost:8000/api/v1/attendance/check-out -H "Authorization: Bearer $ET"`
      returns `200` with a `checkOutTime`, a numeric `hoursWorked` > 0, and
      `extraHours`; **break math** holds (`hoursWorked = (checkOut − checkIn) −
      breakMinutes`) and `extraHours` = hours beyond the standard day (ADR-019).
- [ ] **Me ranges:** `GET /attendance/me?range=daily`, `?range=weekly`,
      `?range=monthly` each return `200` with a `data` array and `meta.nextCursor`;
      rows expose Date/CheckIn/CheckOut/WorkHours/ExtraHours/Break; the default view
      is current-month day-wise.
- [ ] **workStatus correctness (ADR-017):** the computed `workStatus` is `PRESENT`
      after check-in, `ON_LEAVE` for an employee with an approved leave covering today,
      and `ABSENT` for one with neither — derived from `Attendance` + approved
      `LeaveRequest`, and exported for S12/S13.
- [ ] **Admin list:** `GET /attendance?date=<today>&status=PRESENT` as ADMIN returns
      `200`, envelope + `meta`; EMPLOYEE hitting it → `403`.
- [ ] **Summary:** `GET /attendance/summary` as ADMIN returns
      `{ totalEmployees, present, absent, onLeave }` and the numbers are correct
      against the seed (`present + absent + onLeave` consistent with `totalEmployees`).
- [ ] Scope check: only `apps/api/src/modules/attendance/*` was touched (plus shared
      schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S06 → `DONE`; under "Interfaces produced (detail)" list the
  five endpoints, the `range` window definitions (incl. the current-month default),
  the summary count rule, the exported `workStatus` helper signature (ADR-017, for
  S12/S13), and the `409` codes (so S12's dashboard + S13 directory + S14's attendance
  page match the contract).
- `build/logs/S06-log.md`: from `_TEMPLATE.md` — record the `hoursWorked`/`extraHours`
  rounding + standard-workday value used, the range windows chosen, the `workStatus`
  derivation rule, the exact summary counting rule, and any deviation.

## ▶ Copy-paste prompt
```
You are running build session S06 (Attendance Module) for the Dayflow HRMS monorepo.
This is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S06-attendance.md (your full spec). Also read docs/API.md §3 and the
   ADR entries it references (ADR-005, 017, 019, 001, 010).
2. Verify the preconditions (S03 DONE; requireAuth/requireRole importable; shared
   attendance schemas exist; DB seeded). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s06-attendance, build ONLY
   the Deliverables listed in the session file, run every Acceptance criteria command
   and confirm it passes, then update build/STATE.md and write
   build/logs/S06-log.md, and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S12 dashboard, S14
   attendance page), and the next session to run.

Stay strictly in scope — attendance module only; do not reimplement auth. When the
spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

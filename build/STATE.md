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

| # | Session | Status | Branch | Depends on | Interfaces produced (fill on DONE) |
|---|---------|--------|--------|-----------|------------------------------------|
| S00 | Bootstrap & tooling | TODO | — | — | root scripts, workspaces, docker-compose, `.env.example` |
| S01 | Database (Prisma) | TODO | — | S00 | migration name, seed cmd, demo creds |
| S02 | Shared package | TODO | — | S00 | exported Zod schemas + types + constants |
| S03 | API core | TODO | — | S01, S02 | app bootstrap, middleware, `AppError`, `/health` |
| S04 | Auth module | TODO | — | S03 | auth endpoints, `requireAuth`/`requireRole`, token shape |
| S05 | Employee & department | TODO | — | S03 | employee/department endpoints |
| S06 | Attendance module | TODO | — | S03 | attendance endpoints |
| S07 | Leave module | TODO | — | S03 | leave endpoints, balance logic |
| S08 | Payroll module | TODO | — | S03 | payroll endpoints, payslip PDF |
| S09 | Realtime + notifications + audit | TODO | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | TODO | — | S02 | api client, auth context, layout, design tokens |
| S11 | Auth pages | TODO | — | S10, S04 | `/signin`, `/signup` |
| S12 | Dashboards + analytics | TODO | — | S10, S06–S08 | `/dashboard` (both roles), charts |
| S13 | Profile + directory | TODO | — | S10, S05 | `/profile`, `/employees` |
| S14 | Attendance + leave pages | TODO | — | S10, S06, S07 | `/attendance`, `/leaves`, approvals |
| S15 | Payroll pages + reports | TODO | — | S10, S08 | `/payroll`, export |
| S16 | Polish, tests, prod, demo | TODO | — | all | Dockerfiles, tests, README, demo script |

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

_(empty — no sessions completed yet)_

---

## Blockers / notes (cross-session announcements)

> Put anything here that affects other agents: contract changes, schema changes,
> discovered gotchas, decisions that need recording in `docs/DECISIONS.md`.

_(none yet)_

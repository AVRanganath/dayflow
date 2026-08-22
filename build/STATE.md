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

> **Claim a session before starting** (see SESSION_PROTOCOL §5): set Status → `WIP`,
> put your name in **Owner** and your branch in **Branch**, and commit that one-line
> change first so teammates see it. Never start a session someone already owns.

| # | Session | Status | Owner | Branch | Depends on | Interfaces produced (fill on DONE) |
|---|---------|--------|-------|--------|-----------|------------------------------------|
| S00 | Bootstrap & tooling | TODO | — | — | — | root scripts, workspaces, docker-compose, `.env.example` |
| S01 | Database (Prisma) | TODO | — | — | S00 | migration name, seed cmd, demo creds |
| S02 | Shared package | TODO | — | — | S00 | exported Zod schemas + types + constants |
| S03 | API core | TODO | — | — | S01, S02 | app bootstrap, middleware, `AppError`, `/health` |
| S04 | Auth module | TODO | — | — | S03 | auth endpoints, `requireAuth`/`requireRole`, token shape |
| S05 | Employee & department | TODO | — | — | S03 | employee/department/company endpoints, loginId helper |
| S06 | Attendance module | TODO | — | — | S03 | attendance endpoints, `workStatus` helper |
| S07 | Leave module | TODO | — | — | S03 | leave endpoints, balance logic, allocations |
| S08 | Payroll module | TODO | — | — | S03 | payroll endpoints, salary engine, payslip PDF |
| S09 | Realtime + notifications + audit | TODO | — | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | TODO | — | — | S02 | api client, auth context, layout, design tokens |
| S11 | Auth pages | TODO | — | — | S10, S04 | `/signin`, onboarding, change-password |
| S12 | Dashboards + analytics | TODO | — | — | S10, S06–S08 | `/dashboard` (both roles), charts |
| S13 | Profile + directory | TODO | — | — | S10, S05 | `/profile`, `/employees` |
| S14 | Attendance + leave pages | TODO | — | — | S10, S06, S07 | `/attendance`, `/leaves`, approvals |
| S15 | Payroll pages + reports | TODO | — | — | S10, S08 | `/payroll`, export |
| S16 | Polish, tests, prod, demo | TODO | — | — | all | Dockerfiles, tests, README, demo script |

**Suggested 4-person tracks** (roles from `plan.md §4`): **P1** backend →
S04→S07→S09 · **P2** backend → S05→S06→S08 · **P3** frontend → S11→S13 ·
**P4** frontend → S12→S14→S15. S00 first (solo), then S01+S02, then S03+S10 unlock
the two tracks. Everyone converges on S16.

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

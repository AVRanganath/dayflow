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

> **Owners are pre-assigned below** — that is your claim. When you actually start a
> session, flip its Status → `WIP` and fill **Branch** on your feature branch, and give
> the team a heads-up. Everything reaches `main` **only via a reviewed PR** from a
> `feat/sNN-<slug>` branch — never commit or merge to `main` directly.

Owner is the **assigned** person (below); set Status → `WIP` when you actually start.

| # | Session | Status | Owner | Branch | Depends on | Interfaces produced (fill on DONE) |
|---|---------|--------|-------|--------|-----------|------------------------------------|
| S00 | Bootstrap & tooling | TODO | Chandan | — | — | root scripts, workspaces, docker-compose, `.env.example` |
| S01 | Database (Prisma) | TODO | Ranganath | — | S00 | migration name, seed cmd, demo creds |
| S02 | Shared package | TODO | Chandan | — | S00 | exported Zod schemas + types + constants |
| S03 | API core | TODO | Ranganath | — | S01, S02 | app bootstrap, middleware, `AppError`, `/health` |
| S04 | Auth module | TODO | Chandan | — | S03 | auth endpoints, `requireAuth`/`requireRole`, token shape |
| S05 | Employee & department | TODO | Ranganath | — | S03 | employee/department/company endpoints, loginId helper |
| S06 | Attendance module | TODO | Chandan | — | S03 | attendance endpoints, `workStatus` helper |
| S07 | Leave module | TODO | Ranganath | — | S03 | leave endpoints, balance logic, allocations |
| S08 | Payroll module | TODO | Chandan | — | S03 | payroll endpoints, salary engine, payslip PDF |
| S09 | Realtime + notifications + audit | TODO | Ranganath | — | S04–S08 | SSE endpoint, notify service, audit hook |
| S10 | Web foundation | TODO | Pramith | — | S02 | api client, auth context, layout, design tokens |
| S11 | Auth pages | TODO | Pramith | — | S10, S04 | `/signin`, onboarding, change-password |
| S12 | Dashboards + analytics | TODO | Mukunda | — | S10, S06–S08 | `/dashboard` (both roles), charts |
| S13 | Profile + directory | TODO | Pramith | — | S10, S05 | `/profile`, `/employees` |
| S14 | Attendance + leave pages | TODO | Mukunda | — | S10, S06, S07 | `/attendance`, `/leaves`, approvals |
| S15 | Payroll pages + reports | TODO | Mukunda | — | S10, S08 | `/payroll`, export |
| S16 | Polish, tests, prod, demo | TODO | all four | — | all | Dockerfiles, tests, README, demo script |

### Assignment & order (who does what, and the gate to start)
- **Chandan** (backend): S00 → S02 → S04 → S06 → S08. *Runs S00 first, alone — everyone waits on it.*
- **Ranganath** (backend): S01 → S03 → S05 → S07 → S09. *S09 is last (needs all of S04–S08).*
- **Pramith** (frontend): S10 → S11 → S13. *S10 unlocks all frontend.*
- **Mukunda** (frontend): S14 → S15 → S12. *Starts once S06/S07 land; pairs on S10 meanwhile.*
- **All four**: S16 together at the end.

**Wave order:** ① Chandan S00 (solo) → ② Ranganath S01 + Chandan S02 (parallel) →
③ Ranganath S03 + Pramith S10 (parallel) → ④ backend fans out (Chandan S04/S06/S08,
Ranganath S05/S07) while frontend follows each module (Pramith S11→S13, Mukunda
S14→S15) → ⑤ Ranganath S09 + Mukunda S12 → ⑥ all four on S16.

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

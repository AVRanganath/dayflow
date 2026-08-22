# S16 — Polish, Tests, Docker Prod, README & Demo

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S16-log.md` and commit before you finish.

- **Owns:** cross-cutting finalization — UX polish across all web pages, the ADMIN
  Settings page (ADR-016), a test pass across the repo, production Docker, env
  validation, and the docs (`README.md`, `DEMO.md`). **Produces:** a demo-ready, green (lint + typecheck + tests), fully
  containerized app where every page works against the real API and every
  differentiator in `plan.md §2` is demonstrable.
- **Depends on:** **ALL** prior sessions (S00–S15) `DONE`. **Unblocks:** the demo /
  final submission. Runs last, alone (not parallelizable).

## Goal
Take the feature-complete app to production quality and demo-readiness: loading
skeletons, error boundaries, and toasts everywhere; a responsive pass; the ⌘K command
palette (differentiator #7); empty states; multi-stage production Dockerfiles + a prod
compose; a real test pass with lint + typecheck green repo-wide; env validation on
boot; and the final `README.md` + a `DEMO.md` rehearsal script. Confirm every §2
differentiator is demonstrable end-to-end.

## Preconditions
- S00–S15 are all `DONE` in `build/STATE.md`. In particular S09 (realtime/SSE/audit),
  S12 (dashboards/charts), and S11/S13/S14/S15 (all feature pages) are complete.
- `docker compose up -d` (dev Postgres + Redis from S00) works; the seed (S01, ~30
  employees with history) runs; `npm run dev` brings up api (**:8000**) + web
  (**:3000**); seed creds log in (`plan.md`: Admin `admin@dayflow.com`/`Admin@123`,
  Employee `john@dayflow.com`/`Employee@123`).
- You are on latest `main`; `npm install` works.

## Deliverables (exact files)
### UX polish (cross-cutting; touch pages as needed, minimal per-file changes)
- **Loading skeletons** for every data-backed web page/section (dashboard cards,
  tables, profile, attendance, leave, payroll) — a reusable `Skeleton` in the S10
  component set; wire it into each page's loading state (`loading.tsx` where it fits
  App Router).
- **Error boundaries** — `apps/web/app/(app)/error.tsx` (segment boundary) + a global
  fallback; friendly message + retry, no stack traces to users.
- **Toasts** — ensure success/error toasts fire on every mutation (profile save,
  check-in/out, apply/approve/reject leave, salary edit, uploads) using the S10 Toast.
- **Empty states** — consistent EmptyState on every list that can be empty (directory,
  attendance, leave history, approvals, payroll history).
- **Responsive pass** — verify desktop (1280px+) full sidebar, tablet (768–1279px)
  collapsible/hamburger sidebar, mobile (<768px) bottom nav + stacked cards + tables-
  as-cards, per `docs/UI_DESIGN_PROMPT.md` "Responsive Behavior". Fix breaks.
- **Command palette (⌘K)** — `apps/web/components/command-palette.tsx` +
  provider/hook: ⌘K / Ctrl+K opens a searchable palette to navigate pages and run role-
  appropriate quick actions (check in/out, apply leave, go to profile/employees/…);
  respects RBAC (differentiator #7).

### Settings page (ADR-016)
- `apps/web/app/(app)/settings/page.tsx` — the **Settings page** (ADR-016),
  **ADMIN-only** (gate at the route + hide the nav item for non-admins). Loads
  `GET /api/v1/company` and edits via `PUT /api/v1/company`: **Company Name**, **Upload
  Logo**, and the config block — **PF (employee/employer %), Professional Tax, salary
  component default rates, and default working-days/week**. Reuse S10's form fields +
  Toast; INR context per ADR-008. Add a thin `apps/web/lib/company.ts` helper
  (`getCompany()`, `updateCompany(body)`) if S10's api layer doesn't already cover it.

### Production Docker
- `apps/api/Dockerfile` — multi-stage (deps → build → runtime); runs `prisma generate`
  + build; small runtime image; non-root user; expects env at runtime.
- `apps/web/Dockerfile` — multi-stage using **Next standalone output**
  (`output: 'standalone'` in `next.config`); build then copy `.next/standalone`;
  non-root; exposes **3000**.
- `docker-compose.prod.yml` — Postgres + Redis + api + web wired together (api depends
  on healthy db/redis; web depends on api), env from a prod env file, a
  migrate+seed step (or documented one-shot), sane restart policy. Ports web **3000**,
  api **8000**.

### Tests + gates
- **Unit tests** for the business math + auth: leave working-day / balance logic
  (differentiator #4); the **salary engine `computeSalary(wage, cfg)`** (ADR-013 —
  component rules, total = Wage, PF/Prof-Tax deductions) and **payable-days proration**
  (ADR-014 — `netSalary = round(monthlyNet × payableDays / workingDaysInMonth)`); the
  **`generateLoginId()`** generator (ADR-012 — `OI`+initials+join-year+serial format);
  plus JWT sign/verify + password hash/compare (co-locate as `*.test.ts` in the owning
  module).
- **A couple of API integration tests** — e.g. signin → protected route (RBAC 401/403)
  and apply-leave → approve → balance decrement (spins the app against a test db;
  document how it's run).
- **Repo-wide green:** `npm run lint`, `npm run typecheck`, `npm test` all pass.
- **Env validation on boot** — confirm/finish the Zod env validation in api (and any
  web build-time check); the process exits with a clear message if a required var
  (`plan.md §8`) is missing. Add if not already present from S03.

### Docs
- `README.md` — final: what Dayflow is, architecture overview (monorepo layout, stack
  table), **how to run** (dev: `docker compose up -d` + `npm run dev`; prod:
  `docker compose -f docker-compose.prod.yml up`), env setup, seed + **demo
  credentials**, and a short **demo script** pointer.
- `DEMO.md` — a rehearsal script: the exact click-path that shows every differentiator
  in `plan.md §2` (real-time approval, analytics charts, audit trail, smart leave
  engine, payslip PDF + CSV, notifications, ⌘K, rich seed), with the creds to use and
  the order to demo in.

## Implementation notes
- **Differentiator checklist (verify each is demonstrable, `plan.md §2`):**
  (1) real-time approvals/presence via SSE; (2) analytics dashboard charts;
  (3) audit trail surfaced in UI; (4) smart leave engine (balance/overlap/working-day);
  (5) payslip PDF + CSV export; (6) in-app + email (console) notifications; (7) ⌘K
  command palette + polished responsive/accessible UI; (8) rich demo seed;
  (9) **the Indian payroll engine** — wage-based salary structure with component
  auto-recompute and attendance-driven payable-days proration (ADR-013/014);
  (10) **system-generated identities + Settings** — auto-generated Login IDs
  (ADR-012) and the ADMIN Settings page (Company name/logo + PF/tax/component-rate +
  working-days config, ADR-016). Anything not demonstrable is a bug — fix it or record
  the gap loudly in `STATE.md` + the log.
- **Minimal, surgical edits.** This session touches many files but each change should
  be small (add a loading state, wrap in a boundary, fix a breakpoint). Don't rewrite
  features. If a page owned by an earlier session is broken, fix minimally and note it.
- **Accessibility.** Keyboard-navigable palette + modals, focus traps, labelled
  inputs, sufficient contrast — the "Linear/Rippling-grade finish" the plan calls for.
- **Docker standalone.** Next must emit `standalone`; verify the web image runs
  without dev deps. Non-root users in both images; no secrets baked in.
- **Honesty (protocol §3).** "Leave it green or say it's red." Don't claim a
  differentiator or a test passes if you didn't run it.

## Acceptance criteria
Run and confirm each:
- [ ] `npm run lint` and `npm run typecheck` exit 0 repo-wide.
- [ ] `npm test` runs and passes (leave math, the salary engine `computeSalary` +
      payable-days proration, the `generateLoginId` generator, auth unit tests, and the
      API integration tests).
- [ ] **Settings page (ADR-016):** as ADMIN, `/settings` loads `GET /company` and saving
      `PUT /company` persists Company Name, logo, and PF/tax/component-rate +
      working-days config; the page is gated ADMIN-only (employees are redirected and
      the nav item is hidden).
- [ ] `docker compose up -d` (dev db/redis) + seed + `npm run dev` brings up the full
      stack; both seed accounts log in and every page in `docs/UI_DESIGN_PROMPT.md`
      works against the real API.
- [ ] `docker compose -f docker-compose.prod.yml up` builds the multi-stage api + web
      images (web via Next standalone) and serves web on **:3000**, api on **:8000**
      end-to-end with seeded data.
- [ ] Loading skeletons, error boundaries, empty states, and toasts are present across
      the pages listed above; the responsive pass holds at desktop/tablet/mobile.
- [ ] **⌘K** opens the command palette and navigates / runs role-appropriate actions.
- [ ] **Env validation:** removing a required var from `plan.md §8` makes the api exit
      on boot with a clear message.
- [ ] Every differentiator in `plan.md §2` is demonstrable via the `DEMO.md` script.
- [ ] `README.md` explains how to run (dev + prod) and demo, with credentials;
      `DEMO.md` walks the full rehearsal.

## On completion (Step 6)
- `build/STATE.md`: set S16 → `DONE`; under "Interfaces produced (detail)" note the
  prod Docker commands, the test command(s), the command-palette entry point, and the
  differentiator verification result (all green, or the exact gaps). Mark the project
  demo-ready.
- `build/logs/S16-log.md`: from `_TEMPLATE.md` — record which differentiators you
  verified, any that needed a fix, responsive/Docker gotchas, and any deviation.

## ▶ Copy-paste prompt
```
You are running build session S16 (Polish, Tests, Docker prod, README & Demo) for the
Dayflow HRMS monorepo. This is a fresh chat with no prior memory — all context lives
in committed files. This is the final session.

1. Read in order: AGENTS.md, plan.md (esp. §2 differentiators + §9 definition of
   done), build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S16-polish-tests-prod.md (your full spec). Skim docs/UI_DESIGN_PROMPT.md
   (Responsive Behavior) and docs/DECISIONS.md — esp. ADR-012, 013, 014, 016 for the
   Settings page and the salary-engine / loginId / payable-days unit tests.
2. Verify the preconditions: S00–S15 all DONE, dev docker + seed + npm run dev work,
   seed creds log in. If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s16-polish-prod, build ONLY
   the Deliverables listed in the session file (surgical, minimal per-file edits), run
   every Acceptance criteria command/check and confirm it passes, then update
   build/STATE.md and write build/logs/S16-log.md, and commit using Conventional
   Commits (no AI co-author line).
4. Finish with a handoff summary: the project is demo-ready; confirm every §2
   differentiator is demonstrable (or list exact gaps), and point at DEMO.md.

Stay in scope — polish, the ADMIN Settings page (ADR-016), tests (incl. the salary
engine, loginId generator, and payable-days proration), prod Docker, env validation,
README + DEMO only; fix broken pages minimally and note it. When the spec is ambiguous,
follow docs/DECISIONS.md. Begin.
```

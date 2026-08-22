# Dayflow HRMS — Master Plan

> **Multi-agent note.** This repo is built by AI agents (Claude Code, Google
> Antigravity, and others) across many independent chat sessions. No chat shares
> memory with another. Before doing anything, read `AGENTS.md`, then
> `build/SESSION_PROTOCOL.md`, then `build/STATE.md`, then your session file in
> `build/sessions/`. This `plan.md` replaces `CLAUDE.md` — do not create one.

*Every workday, perfectly aligned.*

---

## 1. Vision

Dayflow is a Human Resource Management System that digitizes the full employee
lifecycle: secure auth, role-based dashboards, employee profiles, attendance,
leave & time-off, payroll visibility, and approval workflows for HR/Admin.

This is a hackathon build (Odoo problem statement, `docs/Dayflow.pdf`). The bar is
**not** a CRUD demo — it is a **production-quality, scalable MVP that wins**. Two
things earn the win: (1) clean, type-safe, well-architected code the judges can
read, and (2) a handful of differentiators below that feel like a real product.

## 2. What makes Dayflow win (differentiators)

These are the features that lift Dayflow above a checklist HRMS. Core first,
differentiators layered on top — each is scoped into a session so it is real, not
vaporware.

1. **Real-time approvals & presence.** Leave approvals and attendance updates push
   to the browser over Server-Sent Events — "changes reflect immediately in
   employee records" (spec 3.5.2) done for real, not by polling.
2. **Analytics dashboard.** Admin sees live donut/bar charts: attendance mix,
   department headcount, leave trends, monthly payroll total. (spec §6)
3. **Full audit trail.** Every sensitive mutation (salary edits, approvals, role
   changes) is written to an immutable `AuditLog` and surfaced in the UI.
4. **Smart leave engine.** Server-side balance validation, overlap detection,
   working-day counting (skips weekends), and live balance decrement on approval.
5. **Payslip PDF + CSV export.** Employees download a real payslip PDF; admins
   export attendance/payroll to CSV.
6. **In-app + email notifications.** Approvals, rejections, and payslip generation
   fire notifications (in-app always; email via a pluggable provider).
7. **Command palette (⌘K)** and polished, responsive, accessible UI — the
   Linear/Rippling-grade finish described in `docs/UI_DESIGN_PROMPT.md`.
8. **Rich demo seed.** ~30 employees across departments with months of realistic
   attendance, leave, and payroll history, so the demo looks like a live company.

9. **Real Indian payroll engine.** A per-employee salary structure computed from a
   monthly Wage — Basic, HRA, Standard Allowance, Performance Bonus, LTA, Fixed
   Allowance, PF (employee + employer), Professional Tax — auto-recalculating when
   the wage changes, with **attendance-driven payslips** (unpaid leave / missing days
   reduce payable days). See `docs/DECISIONS.md` ADR-013/014.
10. **System-generated identities.** Admin/HR create employees; the system mints a
    Login ID (`OIJODO20220001` format) and a first-login password (ADR-012). A
    single-company Settings page (name, logo, PF/tax rates) drives it all (ADR-016).

Stretch (only if ahead of schedule; do not block core): natural-language leave
requests / an HR assistant powered by an LLM. Tracked as an optional session.

> **Design board.** The team's detailed design lives in the Excalidraw export
> `Human Resource Management System - 8 hours.svg`. Its decisions are captured
> authoritatively in `docs/DECISIONS.md` ADR-012…ADR-019 and enrich sessions
> S01/S02/S04/S05/S06/S07/S08 and the UI sessions. Where the board and the PDF
> conflict, the board wins.

## 3. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 (App Router, TS, Tailwind) | SSR, DX, performance |
| Backend | Node.js + Express (TS) | lightweight, explicit, scalable |
| Database | PostgreSQL + Prisma ORM | integrity + end-to-end type safety |
| Cache/Realtime | Redis | rate limiting, token blacklist, pub/sub for SSE |
| Auth | JWT (access + refresh) + bcrypt | stateless, horizontally scalable |
| Validation | Zod (shared package) | one schema for api + web |
| Container | Docker + Docker Compose | reproducible env, prod parity |
| Monorepo | npm workspaces + Turborepo | shared code, cached builds |

Everything is **TypeScript, `strict`, no `any`**.

## 4. Repository structure

```text
dayflow/
├── AGENTS.md              # entry point for every AI agent
├── plan.md               # this file — master plan (replaces CLAUDE.md)
├── README.md             # public-facing project readme
├── docs/                 # architecture, api, database, decisions, ui spec
├── build/                # the multi-agent build system
│   ├── SESSION_PROTOCOL.md
│   ├── STATE.md          # live progress ledger (shared memory)
│   ├── sessions/         # SNN-*.md — one spec + prompt per session
│   └── logs/             # SNN-log.md — one journal per completed session
├── apps/
│   ├── api/              # Express backend
│   └── web/              # Next.js frontend
└── packages/
    ├── db/               # Prisma schema, migrations, seed
    ├── shared/           # Zod schemas, types, constants (api + web)
    └── config/           # shared tsconfig / eslint / prettier
```

## 5. The build model — sessions, not phases

The work is cut into **sessions**. A session is one self-contained unit that a
single fresh chat can complete end-to-end. Each session has a file in
`build/sessions/` containing: goal, preconditions, exact files to produce,
acceptance criteria, and a **copy-paste prompt** to start the chat. Context passes
between sessions only through committed files (`build/STATE.md`, `build/logs/`, and
the code itself) — never through chat memory. See `build/SESSION_PROTOCOL.md`.

### Roadmap (dependency order)

| # | Session | Depends on | Parallelizable with |
|---|---------|-----------|---------------------|
| S00 | Bootstrap & tooling (monorepo, TS, lint, docker, env) | — | — |
| S01 | Database: Prisma schema, migrations, seed | S00 | S02 |
| S02 | Shared package: Zod schemas, types, constants | S00 | S01 |
| S03 | API core: app, middleware, errors, config, health, logging | S01, S02 | — |
| S04 | Auth module (signup/signin/refresh/logout, JWT, RBAC) | S03 | S05–S08 |
| S05 | Employee & department module | S03 | S04, S06–S08 |
| S06 | Attendance module | S03 | S04, S05, S07, S08 |
| S07 | Leave module (apply, approve/reject, balances) | S03 | S04–S06, S08 |
| S08 | Payroll module (view, admin update, payslip PDF) | S03 | S04–S07 |
| S09 | Realtime + notifications + audit (SSE, Redis pub/sub) | S04–S08 | — |
| S10 | Web foundation (Next, Tailwind, design system, api client, auth) | S02 | — |
| S11 | Auth pages (signup / signin) | S10, S04 | S12–S15 |
| S12 | Dashboards (employee + admin + analytics charts) | S10, S06–S08 | S11, S13–S15 |
| S13 | Profile + employee directory pages | S10, S05 | S11, S12, S14, S15 |
| S14 | Attendance + leave pages | S10, S06, S07 | S11–S13, S15 |
| S15 | Payroll pages + reports/export | S10, S08 | S11–S14 |
| S16 | Polish, tests, Docker prod, README, demo rehearsal | all | — |

Backend modules S04–S08 are independent once S03 lands; frontend feature pages
S11–S15 are independent once S10 lands. Run them in parallel chats when you have
the people/agents.

## 6. Coding standards (judges will read the code)

- **TypeScript strict, no `any`.** Shared types come from `packages/shared`; never
  duplicate a type across api and web.
- **Validate at the boundary.** Every endpoint parses input with a Zod schema from
  `packages/shared`. Every env is validated on boot.
- **Layered backend.** `route → controller → service → prisma`. Controllers are
  thin; business logic lives in services. No Prisma calls in controllers.
- **Errors.** Custom `AppError` subclasses + one global error middleware. Standard
  response envelope (see `docs/API.md`). Never leak stack traces to clients.
- **Naming.** `kebab-case` files (`leave.service.ts`), `PascalCase` React
  components, `camelCase` vars, `UPPER_SNAKE_CASE` constants.
- **Docs.** JSDoc on every exported function/component explaining its purpose.
- **Security.** bcrypt, helmet, strict CORS, rate limiting on auth, HttpOnly
  refresh cookie, RBAC at API and UI, row-level checks in services.

## 7. Git workflow

- Branch per session: `feat/sNN-<slug>` (e.g. `feat/s04-auth`).
- **Conventional Commits**, short messages, scoped: `feat(auth): add signin endpoint`.
- **No AI/agent co-author lines in commits.**
- PRs into `main`, one session per PR, never force-push `main`.

## 8. Environment variables

Canonical list lives in `.env.example` (created in S00). Summary:

**API** (`apps/api/.env`): `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`,
`JWT_REFRESH_EXPIRY`, `CORS_ORIGIN`.
**Web** (`apps/web/.env.local`): `NEXT_PUBLIC_API_URL`.

## 9. Definition of done (whole project)

`docker compose up` brings up Postgres + Redis; `npm run dev` runs api + web;
seeded demo credentials log in; every page in `docs/UI_DESIGN_PROMPT.md` works
against the real API; the differentiators in §2 are demonstrable; lint + typecheck
+ tests are green; `README.md` explains how to run and demo it.

Demo credentials (from seed): **Admin** `admin@dayflow.com` / `Admin@123` ·
**Employee** `john@dayflow.com` / `Employee@123`.

<div align="center">

# Dayflow

**Every workday, perfectly aligned.**

A production-grade Human Resource Management System — auth, employee profiles,
attendance, leave & time-off, payroll, approvals, and live analytics.

Next.js 14 · Express · PostgreSQL · Prisma · Redis · Zod · JWT · Docker · TypeScript

</div>

---

> **Built by AI agents across many sessions.** This repo is developed by AI coding
> agents (Claude Code, Google Antigravity, and others) working one *session* at a
> time in separate chats. If you are an agent, start at **[`AGENTS.md`](./AGENTS.md)**.
> If you are a human, read on.

## What it does

Dayflow digitizes the employee lifecycle for two roles — **Admin/HR** and
**Employee** — per the Odoo hackathon brief (`docs/Dayflow.pdf`):

- 🔐 Secure JWT auth (signup/signin/refresh/logout), role-based access
- 👤 Employee profiles (personal, job, salary, documents)
- 🗓️ Attendance (check-in/out, daily/weekly/monthly, admin overview)
- 🏖️ Leave & time-off (apply, balances, HR approve/reject) — **updates in real time**
- 💰 Payroll (read-only for employees, admin control) + **payslip PDF / CSV export**
- 📊 Admin analytics dashboard, 🔔 notifications, 📝 full audit trail

See **[`plan.md`](./plan.md) §2** for the differentiators that make this more than a
CRUD demo.

## Quick start

```bash
# 1. Install (npm workspaces monorepo)
npm install

# 2. Start infrastructure (Postgres + Redis)
docker compose up -d

# 3. Set up the database (schema + rich demo seed)
npm run db:migrate
npm run db:seed

# 4. Run the full stack (api + web)
npm run dev
```

- Web: http://localhost:3000 · API: http://localhost:8000/api/v1 ·
  Health: http://localhost:8000/api/v1/health

**Demo credentials (seeded):** Admin `admin@dayflow.com` / `Admin@123` ·
Employee `john@dayflow.com` / `Employee@123`

> Steps 1–4 come online as the build sessions land — see current progress in
> **[`build/STATE.md`](./build/STATE.md)**.

## How this repo is built

Work is cut into **sessions** (`build/sessions/`), each a self-contained unit one
chat completes end-to-end. Context passes between chats through committed files —
never chat memory. The rules live in **[`build/SESSION_PROTOCOL.md`](./build/SESSION_PROTOCOL.md)**;
live progress in **[`build/STATE.md`](./build/STATE.md)**.

To run the next session: open `build/STATE.md`, find the next `TODO`, open its file
in `build/sessions/`, and paste its **"▶ Copy-paste prompt"** into a fresh agent chat.

## Documentation

| Doc | Contents |
|-----|----------|
| [`plan.md`](./plan.md) | Master plan: vision, stack, differentiators, roadmap |
| [`AGENTS.md`](./AGENTS.md) | Entry point for any AI agent |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System design, RBAC, scalability, security |
| [`docs/API.md`](./docs/API.md) | REST API contract |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Data model + ER diagram |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Design decisions (authoritative tie-breaker) |
| [`docs/UI_DESIGN_PROMPT.md`](./docs/UI_DESIGN_PROMPT.md) | Design system of record (tokens) + page specs |
| [`UI/README.md`](./UI/README.md) | Built design handoff — per-screen anatomy, state model, open gaps |
| [`docs/design-board.svg`](./docs/design-board.svg) | The team's detailed design board (source for ADR-012…019) |

## Repository layout

```text
apps/        api (Express) · web (Next.js)
packages/    db (Prisma) · shared (Zod + types) · config (tsconfig/eslint/prettier)
docs/        architecture, api, database, decisions, ui spec
UI/          hi-fi screen prototypes (.dc.html) + design handoff README
build/       session protocol, state ledger, session specs, logs
```

## License

Hackathon project. All rights reserved by the Dayflow team.

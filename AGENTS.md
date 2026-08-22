# AGENTS.md — Read This First

> **This file is the single entry point for every AI agent** (Claude Code, Google
> Antigravity, Cursor, OpenAI Codex, Gemini, or any other) that touches this
> repository. It follows the cross-agent [`AGENTS.md`](https://agents.md) convention.
> If your tool prefers a different filename, this file is mirrored by `plan.md`
> (the master plan). **Do not create a `CLAUDE.md`** — `plan.md` is its replacement.

---

## 0. The one rule

**This repository is built by many AI agents across many separate chat sessions.
No session shares memory with any other.** Everything an agent needs to continue
the work lives in committed files, never in chat history. Before you write a
single line of code, read these four files in order:

1. **`plan.md`** — what we are building and why (the master plan). Always in context.
2. **`build/SESSION_PROTOCOL.md`** — how a session works: how you get context, how
   you log, how you hand off to the next agent. **This is mandatory reading.**
3. **`build/STATE.md`** — the live progress ledger. The single source of truth for
   "what is done, what is in progress, what interfaces already exist." Read it at
   the start of every session; update it at the end.
4. **Your session file** — `build/sessions/SNN-*.md`. The exact, unambiguous spec
   for the unit of work you were asked to do.

If you were dropped into this repo with no task, open `build/STATE.md`, find the
next `TODO` session, open its file in `build/sessions/`, and follow it.

---

## 2. Golden rules for every agent

- **Never assume prior chat memory.** If a fact is not in a committed file, it does
  not exist. Write down anything the next agent will need.
- **Stay inside your session's scope.** Do not build files that belong to another
  session. If you must change a shared file, note it in your log and in `STATE.md`.
- **The contract is law.** `docs/DECISIONS.md` and `docs/API.md` define the API and
  data contracts. If code and docs disagree, the docs win — fix the code, or if the
  docs are wrong, fix the docs *and* record the decision in `docs/DECISIONS.md`.
- **Leave the repo green.** A session is only "done" when its acceptance criteria in
  the session file pass. Run the checks. If you cannot, say so explicitly in your log.
- **Conventional Commits, always.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `test:`. Keep messages short. **Do not add any AI/agent as a commit co-author.**
- **Update the ledger before you stop.** The last thing every session does is update
  `build/STATE.md` and write `build/logs/SNN-log.md`. This is how the next agent
  (which may be a different AI on a different day) knows what happened.

---

## 3. Where things live

| Path | What it is |
|------|-----------|
| `plan.md` | Master plan: vision, stack, differentiators, roadmap. Always-load context. |
| `build/SESSION_PROTOCOL.md` | The operating manual for a build session. |
| `build/STATE.md` | Live progress ledger (shared memory between sessions). |
| `build/sessions/` | One file per session, each with a copy-paste kickoff prompt. |
| `build/logs/` | One journal per completed session (decisions, deviations, gotchas). |
| `docs/ARCHITECTURE.md` | System design, RBAC, scalability, security. |
| `docs/API.md` | REST API contract (authoritative for endpoints). |
| `docs/DATABASE.md` | Data model and ER diagram. |
| `docs/DECISIONS.md` | Design decisions log (ADRs). Resolves any spec conflicts. |
| `docs/UI_DESIGN_PROMPT.md` | Design system + page-by-page UI spec. |
| `apps/api/` | Express + TypeScript backend. |
| `apps/web/` | Next.js 14 frontend. |
| `packages/db/` | Prisma schema, migrations, seed. |
| `packages/shared/` | Zod schemas, shared types, constants (used by api AND web). |
| `packages/config/` | Shared tsconfig / eslint / prettier base configs. |

---

## 4. Quick facts

- **Product:** Dayflow — an HRMS (auth, employees, attendance, leave, payroll,
  approvals, analytics). Built for the Odoo hackathon; goal is a production-quality,
  scalable, *winning* MVP.
- **Stack:** Next.js 14 (web) · Express + TypeScript (api) · PostgreSQL + Prisma ·
  Redis · Zod · JWT · Docker. Monorepo via npm workspaces + Turborepo.
- **Language:** TypeScript everywhere, `strict` mode, no `any`.

Now go read `plan.md`.

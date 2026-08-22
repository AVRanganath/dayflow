# S00 — Bootstrap & Tooling

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S00-log.md` and commit before you finish.

- **Owns:** repo root tooling, workspaces, Docker, env. **Produces:** a repo where
  `npm install`, `npm run typecheck`, and `docker compose up -d` all work.
- **Depends on:** nothing. **Unblocks:** S01, S02.

## Goal
Turn the docs-only repo into a working monorepo skeleton: npm workspaces +
Turborepo, shared TS/lint/prettier config, Docker Compose for Postgres + Redis, and
`.env.example` files. No feature code — just the foundation every later session
stands on.

## Preconditions
- Node 18+ and Docker installed (`node -v`, `docker -v`).
- You are on latest `main`.

## Deliverables (exact files)
- `package.json` (root) — private, `workspaces: ["apps/*","packages/*"]`, scripts:
  `dev`, `build`, `lint`, `typecheck`, `format`, `db:*` (proxy to Turborepo).
- `turbo.json` — pipeline for `build`, `dev`, `lint`, `typecheck`.
- `.gitignore` — node_modules, dist, .next, .env, .env.local, prisma generated.
- `.nvmrc` — `18`.
- `packages/config/` — `tsconfig.base.json` (strict, no `any`, `noUncheckedIndexedAccess`),
  `eslint.config.js` (or `.eslintrc.cjs`), `prettier.config.cjs`, `package.json`
  (`@dayflow/config`).
- `apps/api/package.json`, `apps/api/tsconfig.json` (extends base) — deps: express,
  zod, `@dayflow/shared`, `@dayflow/db`; dev: tsx, typescript, eslint. Script stubs
  `dev`/`build`/`typecheck` (may no-op until S03).
- `apps/web/package.json`, `apps/web/tsconfig.json` — Next 14 + Tailwind deps (real
  Next scaffold happens in S10; here just the package + tsconfig so workspaces
  resolve). Keep minimal.
- `packages/shared/package.json`, `tsconfig.json` — `@dayflow/shared`, exports
  `./dist` / `src/index.ts` (content in S02).
- `packages/db/package.json`, `tsconfig.json` — `@dayflow/db`, **pin `prisma` and
  `@prisma/client` to `^6` (ADR-020 — do not use Prisma 7)**, scripts `db:generate`,
  `db:migrate`, `db:seed` (schema already exists; migration/seed in S01).
- `docker-compose.yml` — `postgres:16` (db `dayflow`, user/pass `postgres`, port 5432,
  named volume) and `redis:7` (port 6379). Healthchecks on both.
- `.env.example` (root) + `apps/api/.env.example` + `apps/web/.env.local.example` —
  every var from `plan.md §8` with safe dev defaults.
- `README.md` quick-start section may be stubbed; full README is S16.

## Implementation notes
- Package names: `@dayflow/config`, `@dayflow/shared`, `@dayflow/db`, `@dayflow/api`,
  `@dayflow/web`. Internal deps use `"*"` workspace version.
- TS is **strict**; base config is the single source — every workspace `extends` it.
- Don't install a specific package manager lockfile flavor beyond npm (repo standard
  is npm workspaces). Commit the lockfile.
- Keep `apps/web` minimal here; do NOT run `create-next-app` yet (that's S10) — just
  enough `package.json`/`tsconfig.json` for the workspace to resolve.
- Env defaults must match `docker-compose.yml` (e.g.
  `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dayflow?schema=public`,
  `REDIS_URL=redis://localhost:6379`).

## Acceptance criteria
Run and confirm each:
- [ ] `npm install` completes at the root with no errors.
- [ ] `npm run typecheck` runs across workspaces (may be trivially empty but exits 0).
- [ ] `npm run lint` exits 0.
- [ ] `docker compose up -d` starts postgres + redis; `docker compose ps` shows both
      healthy; `docker compose down` cleans up.
- [ ] `.env.example` files list every var in `plan.md §8`.
- [ ] No feature/business code was added (scope check).

## On completion (Step 6)
- `build/STATE.md`: set S00 → `DONE`; under "Interfaces produced (detail)" note the
  exact root scripts, workspace names, and the `docker compose` command.
- `build/logs/S00-log.md`: from `_TEMPLATE.md` — record any tool-version gotchas.

## ▶ Copy-paste prompt
```
You are running build session S00 (Bootstrap & Tooling) for the Dayflow HRMS
monorepo. This is a fresh chat with no prior memory — all context lives in committed
files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S00-bootstrap.md (your full spec).
2. Verify the preconditions. If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s00-bootstrap, build ONLY
   the Deliverables listed in the session file, run every Acceptance criteria command
   and confirm it passes, then update build/STATE.md and write build/logs/S00-log.md,
   and commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S01, S02), and the
   next session to run.

Stay strictly in scope — no feature code. When the spec is ambiguous, follow
docs/DECISIONS.md. Begin.
```

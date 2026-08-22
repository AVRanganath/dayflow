# Session Log — S00 Bootstrap & Tooling

- **Session:** S00 — Bootstrap & Tooling
- **Agent / model:** Claude Code (Opus 4.8)
- **Branch:** feat/s00-bootstrap
- **Status at end:** DONE (one acceptance step unverifiable — see below)

## What I built
- Root `package.json` — npm workspaces (`apps/*`, `packages/*`), `packageManager`
  pin, and scripts: `dev/build/lint/typecheck/format/format:check` + `db:*`.
- `turbo.json` — `build`/`dev`/`lint`/`typecheck` tasks.
- `.gitignore`, `.nvmrc`, `.prettierignore`.
- `@dayflow/config` — `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`),
  `eslint.base.mjs` (flat, typescript-eslint, `no-explicit-any: error`),
  `prettier.config.mjs`. Root `eslint.config.mjs` / `prettier.config.mjs` consume them.
- Workspace skeletons with compiling placeholders: `@dayflow/api`, `@dayflow/web`,
  `@dayflow/shared`, `@dayflow/db` (each `src/index.ts` names the session that fills it).
- `docker-compose.yml` — postgres:16-alpine + redis:7-alpine with healthchecks + volumes.
- `.env.example` (root) + `apps/api/.env.example` + `apps/web/.env.local.example`,
  defaults matching docker-compose and `plan.md §8`.

## Key decisions
- **`.nvmrc` = 20, not 18** (session file suggested 18). Node 18 is EOL; 20 is current
  LTS and the machine runs v26. `engines.node` is `>=18.17`, so 18 still works.
- **`apps/web` kept truly minimal** — no `next`/`react`/`tailwind` deps yet. S10 runs the
  real Next scaffold (`create-next-app`) which installs and configures them properly;
  adding half a Next setup now would just be overwritten. The workspace still resolves
  and typechecks via a placeholder.
- **ESLint is a single root flat config** (`eslint .`) importing the shared base, rather
  than per-package configs. Flat config doesn't search upward, so one root config is the
  robust choice; the shared rules still live in `@dayflow/config`.
- **`.prettierignore` excludes `**/*.md`** — the docs/session specs use hand-aligned
  tables; Prettier is for code. This keeps `format:check` green without churning docs.
- Added **`packageManager: npm@11.17.0`** to root — Turbo 2.10 refuses to run without it.

## Deviations from the session file
- `.nvmrc` 20 vs 18 (above).
- `apps/web` deps deferred to S10 (above). Session file said "Next 14 + Tailwind deps…
  keep minimal"; I chose the more-minimal path since S10 scaffolds the real project.

## Gotchas / things that bit me
- **Turbo 2.10 requires `packageManager`** in root `package.json` or it errors
  "Could not resolve workspace." Added it.
- **Hardened npm skipped postinstall scripts** (Prisma, esbuild). So the Prisma client
  is NOT generated after `npm install` — S01 must run `npm run db:generate`. `tsx`
  relies on esbuild; if `db:seed`/`dev` fail with an esbuild error, run
  `npm rebuild esbuild` (or approve scripts) first.
- **Disable Turbo telemetry noise** with `TURBO_TELEMETRY_DISABLED=1` if it prompts.

## Acceptance criteria result
- `npm install` → ✅ 242 packages, no errors (3 npm-audit highs, transitive; noted).
- `npm run typecheck` → ✅ 5/5 workspaces pass.
- `npm run lint` → ✅ clean.
- `npm run format:check` → ✅ (code only; `.md` ignored).
- `.env.example` files list every `plan.md §8` var → ✅.
- No feature/business code → ✅ (only scaffold placeholders).
- `docker compose up -d` starts postgres + redis healthy → ⚠️ **NOT VERIFIED.** Docker
  is not installed on this machine (no Docker Desktop / Colima / Podman). The compose
  file is written and YAML-valid; someone with Docker must confirm it boots.

## Handoff — what's now unblocked / TODO
- **Unblocks S01 (Database) and S02 (Shared).** These can run in parallel.
- **Before S01 can run:** a Postgres must be reachable — install Docker + `docker
  compose up -d`, or set `DATABASE_URL` to any Postgres 16. Then S01 runs
  `npm run db:generate && npm run db:migrate && npm run db:seed`.
- Prisma client is not generated yet (S01's first step).

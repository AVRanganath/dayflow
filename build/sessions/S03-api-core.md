# S03 — API Core: App, Middleware, Errors, Config, Health

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S03-log.md` and commit before you finish.

- **Owns:** `apps/api` core only (no feature modules). **Produces:** a booting Express
  server with validated config, structured logging, the error envelope, shared
  prisma/redis clients, rate limiting, auth-middleware **stubs**, and a versioned
  router with a working health check.
- **Depends on:** S01, S02. **Unblocks:** S04, S05, S06, S07, S08.

## Goal
Stand up the backend skeleton every feature module plugs into: `app.ts`/`server.ts`,
Zod-validated env, custom errors + one global error middleware producing the ADR-010
envelope, `@dayflow/db` and Redis clients, Redis-based rate limiting, and
`GET /api/v1/health`. Auth middleware ships as **typed stubs** that S04 fills — no
feature/business logic here.

## Preconditions
- S01 and S02 are `DONE` in `build/STATE.md` (`@dayflow/db` exports `prisma`;
  `@dayflow/shared` exports the envelope types + constants).
- `docker compose up -d` shows Postgres (`5432`) and Redis (`6379`) healthy.
- `apps/api` exists (from S00) with express/zod/`@dayflow/shared`/`@dayflow/db` deps
  and `dev`/`build`/`typecheck` script stubs.
- You are on latest `main`.

## Deliverables (exact files)
Under `apps/api/src/` (layered per `plan.md §6`):
- `config/env.ts` — parse `process.env` with a Zod schema (`PORT` default 8000,
  `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `CORS_ORIGIN` — see `plan.md §8`).
  **Fail fast:** on invalid env, log the issues and `process.exit(1)`. Export a typed
  `env` object.
- `lib/errors.ts` — `AppError` base (`statusCode`, `code`, `message`, optional
  `details`, `isOperational`) plus subclasses `NotFoundError` (404),
  `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403),
  `ConflictError` (409). Each sets the ADR-010 `error.code`.
- `lib/prisma.ts` — re-export the shared client from `@dayflow/db`
  (`export { prisma } from '@dayflow/db'`); do **not** instantiate a second client.
- `lib/redis.ts` — a Redis client from `REDIS_URL` (single shared instance), connect
  on boot, with error logging.
- `lib/logger.ts` — pino (or equivalent) structured logger; export a shared instance.
- `middleware/request-id.ts` — attach a per-request id (uuid) to `req`/response header.
- `middleware/error.ts` — the **single global error handler**: maps `AppError` →
  `{ success:false, error:{ code, message, details? } }` (ADR-010) with its
  `statusCode`; maps a `ZodError` → 400 `VALIDATION_ERROR` with field details; unknown
  errors → 500 `INTERNAL_ERROR` (never leak stack traces to the client — log them).
- `middleware/not-found.ts` — 404 handler for unmatched routes, envelope-shaped.
- `middleware/auth.ts` — **STUBS with final signatures** that S04 fills in:
  `requireAuth` (verifies access token, sets `req.user`) and
  `requireRole(...roles: Role[])`. Export the exact signatures now (and any
  `AuthenticatedRequest`/`req.user` typing) so feature sessions can import them;
  the stub may throw `UnauthorizedError('not implemented')` until S04. Document the
  stub clearly.
- `middleware/rate-limit.ts` — a **Redis-backed** rate limiter factory (fixed/sliding
  window keyed by IP + route); exports a configurable middleware S04 tightens on auth
  routes. Sets `X-RateLimit-*` headers per `docs/API.md`.
- `routes/index.ts` (or `router.ts`) — the base router mounted at `/api/v1`, with
  `GET /api/v1/health` returning `{ success:true, data:{ status:"ok" } }`. Feature
  routers are mounted by S04–S08 (leave TODO hooks, do not implement them).
- `app.ts` — build the Express app: `helmet`, `cors` (origin from `CORS_ORIGIN`),
  `express.json`, request-id, request logging (morgan or pino-http), mount the
  `/api/v1` router, then `not-found` and the global `error` middleware **last**.
  Export `app` (no `listen` here).
- `server.ts` — import `env`, connect Redis, `app.listen(env.PORT)` on **8000**, log
  the URL, and handle graceful shutdown.

## Implementation notes
- **Boundary validation.** The error middleware must already understand `ZodError` so
  feature modules just `schema.parse(req.body)` and let it bubble.
- **No feature modules.** No auth logic, no employee/attendance/leave/payroll code —
  only `health` and the shared plumbing. `middleware/auth.ts` is a stub by design.
- **Single clients.** Prisma comes from `@dayflow/db` (re-export only); one Redis
  client shared app-wide.
- **Envelope everywhere.** Even health and errors use the ADR-010 envelope; import the
  envelope types from `@dayflow/shared`.
- Strict TS, no `any`, JSDoc on exports (`plan.md §6`). Ports: api **8000**, web
  **3000**, postgres **5432**, redis **6379**.

## Acceptance criteria
Run and confirm each:
- [ ] `npm run typecheck -w apps/api` exits 0.
- [ ] `npm run dev -w apps/api` boots and logs listening on `http://localhost:8000`.
- [ ] `curl -s localhost:8000/api/v1/health` returns `{"success":true,"data":{"status":"ok"}}`.
- [ ] `curl -s localhost:8000/api/v1/does-not-exist` returns the ADR-010 error envelope
      (`success:false`, `error.code` set) with 404.
- [ ] Bad env fails fast: `PORT=notanumber npm run dev -w apps/api` (or an unset
      required secret) logs the validation error and exits non-zero — it does **not** boot.
- [ ] A thrown `AppError` is rendered by the global error middleware as the standard
      envelope with the right `statusCode` (verify via a temporary throw or a unit check).
- [ ] Redis rate-limit middleware connects to `6379` and sets `X-RateLimit-*` headers.
- [ ] No feature/business code was added beyond stubs (scope check).

## On completion (Step 6)
- `build/STATE.md`: set S03 → `DONE`; under "Interfaces produced (detail)" record the
  base URL/port (8000), `/api/v1/health`, the `AppError` subclasses + error/envelope
  contract, the `requireAuth`/`requireRole` stub signatures and `req.user` type, the
  rate-limit factory, and the `env`/prisma/redis/logger exports. Note S04–S08 unblocked.
- `build/logs/S03-log.md`: from `_TEMPLATE.md` — record the `req.user` typing decision,
  what the auth stubs throw, and any TODO hooks left for feature routers.

## ▶ Copy-paste prompt
```
You are running build session S03 (API Core: App, Middleware, Errors, Config, Health)
for the Dayflow HRMS monorepo. This is a fresh chat with no prior memory — all
context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S03-api-core.md (your full spec). Also read docs/API.md and
   docs/DECISIONS.md.
2. Verify the preconditions (S01 and S02 DONE; Postgres on 5432 and Redis on 6379
   healthy). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s03-api-core, build ONLY the
   Deliverables listed in the session file, run every Acceptance criteria command and
   confirm it passes, then update build/STATE.md and write build/logs/S03-log.md, and
   commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S04–S08), and the
   next session to run.

Stay strictly in scope — core plumbing and a health check only; auth middleware ships
as typed stubs for S04, no feature code. When the spec is ambiguous, follow
docs/DECISIONS.md. Begin.
```

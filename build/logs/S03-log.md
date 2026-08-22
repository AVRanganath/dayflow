# Session Log — S03 API core: app, middleware, errors, config, health

- **Session:** S03 — API core (App, Middleware, Errors, Config, Health)
- **Agent / model:** Claude Code (Opus 5)
- **Branch:** feat/s03-api-core
- **Status at end:** DONE

## What I built
Under `apps/api/src/`:
- `config/env.ts` — Zod-validated `env` (PORT, NODE_ENV, DATABASE_URL, REDIS_URL,
  JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY,
  CORS_ORIGIN); logs issues and `process.exit(1)` on invalid config.
- `lib/errors.ts` — `AppError` + `NotFoundError`/`ValidationError`/
  `UnauthorizedError`/`ForbiddenError`/`ConflictError`.
- `lib/prisma.ts` — re-exports `prisma` from `@dayflow/db`.
- `lib/redis.ts` — single shared `ioredis` client from `REDIS_URL`.
- `lib/logger.ts` — shared `pino` logger.
- `middleware/request-id.ts` — per-request UUID on `req.id` / `X-Request-Id`.
- `middleware/error.ts` — global error handler: `AppError` → its envelope,
  `ZodError` → 400 `VALIDATION_ERROR`, else → 500 `INTERNAL_ERROR` (logged, not leaked).
- `middleware/not-found.ts` — 404 envelope for unmatched routes.
- `middleware/auth.ts` — `requireAuth`/`requireRole(...roles)` **stubs** with final
  signatures, throwing `UnauthorizedError('... not implemented yet (see S04)')`;
  exports `AuthUser` and augments `Express.Request.user`.
- `middleware/rate-limit.ts` — Redis fixed-window `rateLimit({ windowSeconds, max })`
  factory, sets `X-RateLimit-*` headers.
- `routes/index.ts` — base `router` with `GET /health`; TODO hooks for S04–S09's
  feature routers.
- `app.ts` — assembles the Express app (helmet, cors, json, request-id, pino-http,
  a default rate limit on `/api/v1`, the router, `notFound`, `errorHandler` last).
- `server.ts` — new process entry: connects Redis, `app.listen(env.PORT)`, graceful
  shutdown on SIGINT/SIGTERM. Replaces the S00 placeholder `src/index.ts` (deleted).

`apps/api/package.json`: added `helmet`, `cors` (+`@types/cors`), `ioredis`, `pino`,
`pino-http`; `dev`/`start` scripts now point at `server.ts`; `dev` uses
`tsx watch --env-file=.env` so local runs pick up `apps/api/.env` (gitignored;
`apps/api/.env.example` unchanged).

## Key decisions
- **Named imports for `ioredis`/`pino-http`, not default imports.** Under this
  repo's `"module": "NodeNext"` + `apps/api` being `"type": "module"`, TypeScript's
  real ESM→CJS interop types a default import as the *whole* `module.exports` value,
  not a `.default`-style unwrap. For `ioredis` and `pino-http` that produced "not
  callable/constructable" typecheck errors even though the runtime default export
  works. Both packages also ship a matching named export (`Redis`, `pinoHttp`), which
  is unambiguous under NodeNext — used those instead
  (`import { Redis } from 'ioredis'`, `import { pinoHttp } from 'pino-http'`).
- **Skipped `pino-pretty`.** Plain JSON pino output in all envs to avoid an extra
  dependency for a dev-only convenience; not part of the spec.
- **Request id via `node:crypto randomUUID`**, not a `uuid` package dependency —
  stdlib already covers it.
- **Applied a default global rate limit** (`windowSeconds: 60, max: 100`) on all of
  `/api/v1` in `app.ts`, rather than leaving `rateLimit()` completely unused. The
  acceptance criteria require verifying `X-RateLimit-*` headers end-to-end, and
  there's no feature route yet to hang it on. S04 should add a tighter limiter
  directly on the auth router (signin/signup) — this default stays as the
  API-wide baseline.
- `req.user` typing kept minimal: `{ id: string; role: Role }` — `User` has no
  `companyId` in the current schema (only `Employee` does), so nothing more to type yet.

## Deviations from the session file
None — all listed deliverables built, no feature/business logic added.

## Gotchas / things that bit me
- `npm run dev -w apps/api` needs `apps/api/.env` to exist (copy from
  `.env.example`) or the Zod env validation fails fast by design — that's correct
  behavior, not a bug, but easy to mistake for a broken server on first run.
- Root `npm install` in this environment doesn't run postinstall scripts (see S01's
  note) — unrelated to S03, just confirming it didn't block installing the new deps.

## Acceptance criteria result
All run against `docker compose up -d` (postgres + redis healthy) and
`npm run dev -w apps/api`:
- [x] `npm run typecheck -w apps/api` exits 0 (also ran the full `npm run typecheck`
      across the monorepo — clean).
- [x] `npm run dev -w apps/api` boots and logs `Dayflow API listening on
      http://localhost:8000`.
- [x] `curl -s localhost:8000/api/v1/health` → `{"success":true,"data":{"status":"ok"}}`.
- [x] `curl -s localhost:8000/api/v1/does-not-exist` → 404 with the ADR-010 error
      envelope (`NOT_FOUND`).
- [x] `PORT=notanumber tsx --env-file=.env src/server.ts` logs the validation issue
      and exits 1 — does not boot.
- [x] A temporary `throw new ConflictError(...)` route rendered as
      `{"success":false,"error":{"code":"CONFLICT","message":"temp check"}}` with
      409, via the global error middleware — route removed after verifying.
- [x] `curl -D -` on `/api/v1/health` shows `X-RateLimit-Limit/Remaining/Reset` and
      `X-Request-Id`; Redis `INCR`/`EXPIRE` confirmed connecting to `:6379` (redis
      logged "Redis connected" on boot).
- [x] No feature/business code added — scope is core plumbing + `/health` only,
      `middleware/auth.ts` is stub-only.
- [x] `npm run lint` and `npm run format:check` clean across the whole repo.

## Handoff — what's now unblocked / TODO
S04 (auth), S05 (employee/department), S06 (attendance), S07 (leave), S08
(payroll) can all now start in parallel — they build feature routers mounted in
`routes/index.ts`, use `requireAuth`/`requireRole` (still stubs until S04 fills
them in), and throw from the shared `AppError` hierarchy. S04 additionally needs to
replace the `auth.ts` stubs and should add a stricter rate limiter on the auth
routes rather than relying on the S03 default.

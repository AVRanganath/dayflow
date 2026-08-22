# S04 — Auth Module

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S04-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/auth/*` + filling the `middleware/auth.ts` stubs.
  **Produces:** working signup/signin/refresh/logout, JWT + bcrypt, and the RBAC
  guards (`requireAuth`, `requireRole`) every other module imports.
- **Depends on:** S03 (API core: app, error middleware, `sendSuccess`, `validate`,
  env config, Prisma + Redis clients). **Unblocks:** S11 (auth pages) and enables
  auth on S05–S08 (they import `requireAuth`/`requireRole` from `middleware/auth.ts`).

## Goal
Implement the authentication module end-to-end following the layered architecture
(`route → controller → service → prisma`): password hashing, JWT access+refresh
tokens per ADR-007, the `/auth/*` endpoints from `docs/API.md §1`, and the shared RBAC
middleware. **Per ADR-012 the auth model is company/admin onboarding + credential
login, not employee self-registration:** `signup` bootstraps the first `ADMIN` + the
`Company` (and is closed once an admin exists), `signin` accepts email **or** loginId,
and a new `change-password` clears `mustChangePassword`. Employees are created by
Admin/HR in **S05**, not here. Bring `docs/API.md §1` in line with ADR-012. No feature
code outside auth + the two middleware guards.

## Preconditions
- S03 is `DONE` in `build/STATE.md` (Express app, global error middleware, response
  envelope helper, Zod `validate` middleware, env config, Prisma + Redis clients,
  `middleware/auth.ts` stub file all exist).
- `@dayflow/shared` exports `SignupSchema` (ADR-012 onboarding body), `SigninSchema`
  (email-or-loginId), `ChangePasswordSchema`, `RefreshSchema`, `ForgotPasswordSchema`,
  `ResetPasswordSchema` (from S02). If missing, add them to shared and note it loudly in
  your log + `STATE.md`.
- You are on latest `main`; `npm install` works; `docker compose up -d` is running.

## Deliverables (exact files)
- `apps/api/src/modules/auth/auth.route.ts` — mounts under `/api/v1/auth`; wires the
  seven endpoints below; applies the auth rate limiter to every route; `validate(...)`
  with the shared schema at each write boundary.
- `apps/api/src/modules/auth/auth.controller.ts` — thin controllers: parse req →
  call service → `sendSuccess(res, data, status)`. No Prisma, no business logic.
- `apps/api/src/modules/auth/auth.service.ts` — all logic: bcrypt hash/compare, JWT
  sign/verify, token issue/rotate/blacklist, the signup transaction, email-verify and
  password-reset flows.
- `apps/api/src/lib/jwt.ts` — `signAccessToken`, `signRefreshToken`, `verifyAccess`,
  `verifyRefresh` (secrets + expiries from env config; access **15m**, refresh **7d**).
- `apps/api/src/lib/password.ts` — `hashPassword`, `comparePassword` (bcrypt, cost 10+).
- `apps/api/src/middleware/auth.ts` — **fill the S03 stubs**: `requireAuth`
  (verify access token from `Authorization: Bearer`, reject 401, attach `req.user =
  { userId, employeeId, role }`) and `requireRole(roles: Role[])`
  (e.g. `requireRole(['ADMIN','HR'])` → 403 on mismatch). Exported for S05–S08.
- `apps/api/src/middleware/rate-limit.ts` — `authLimiter` (Redis-backed if available,
  else in-memory; e.g. 10 req / 15 min per IP) applied to `/auth/*`.
- `apps/api/src/modules/auth/auth.test.ts` *(optional)* — unit test for token
  sign/verify + password hash/compare.
- **Update `docs/API.md §1`** so signup matches **ADR-012** (company/admin onboarding
  body `{ companyName, adminEmail, password, firstName, lastName }`, creating the first
  `ADMIN` + `Company` in one tx, `403 REGISTRATION_CLOSED` once an admin exists),
  document `signin` accepting email **or** loginId, add `POST /auth/change-password`,
  and note that `refreshToken` is delivered as an HttpOnly cookie (ADR-007), not read
  from the JSON body on `/refresh` and `/logout`. Note employees are created in S05.

### Endpoints (docs/API.md §1)
- `POST /api/v1/auth/signup` — **company/admin ONBOARDING ONLY (ADR-012).** Allowed
  only while **no `ADMIN` exists**; otherwise `403 REGISTRATION_CLOSED`. Creates the
  first `ADMIN` `User` **and** the `Company` (name; logo/settings default per ADR-016)
  in **one Prisma transaction**; in `NODE_ENV=development` set `isEmailVerified=true`
  (ADR-003). Returns `{ user, company, accessToken }` + sets refresh cookie. `201`.
  Regular employees do **not** self-register (they are created by Admin/HR in S05).
- `POST /api/v1/auth/signin` — verify credentials by **email OR loginId** + password
  (ADR-012); `401 INVALID_CREDENTIALS` on mismatch; returns `{ user, accessToken }`
  (include `mustChangePassword` so the client can force a change) + sets refresh cookie.
  `200`.
- `POST /api/v1/auth/change-password` — **requireAuth.** Verifies `currentPassword`,
  sets the new hash, and **clears `mustChangePassword`** (ADR-012). `200`.
- `POST /api/v1/auth/refresh` — reads the **HttpOnly cookie** (ADR-007), verifies +
  checks it isn't blacklisted, rotates tokens, sets new cookie, returns new
  `{ accessToken }`. `200`.
- `POST /api/v1/auth/logout` — clears the refresh cookie and **blacklists** the token
  in Redis until its natural expiry. `200`.
- `GET /api/v1/auth/verify-email/:token` — marks `isEmailVerified=true`, clears the
  token. `200`.
- `POST /api/v1/auth/forgot-password` — always returns the same generic message
  (no user enumeration); sets `passwordResetToken` + `passwordResetExpiry` and logs
  the link via the console notifier (ADR-003). `200`.
- `POST /api/v1/auth/reset-password` — validates token + expiry, sets new hash,
  clears reset fields. `200`.

## Implementation notes
- **ADR-007 tokens.** `accessToken` (15m) in JSON body, client holds in memory.
  `refreshToken` (7d) set as HttpOnly, `SameSite=Strict`, `Secure` when
  `NODE_ENV=production`, `path=/api/v1/auth`. Cookie name e.g. `dayflow_rt`.
- **ADR-001 roles.** `requireRole(['ADMIN','HR'])` guards management routes.
- **ADR-012 onboarding + credentials.** `signup` is a bootstrap: gate it on
  `count(User where role=ADMIN) === 0`, else `403 REGISTRATION_CLOSED`. `signin` looks
  the user up by `email` OR `loginId` (one query with an OR). `change-password` clears
  `mustChangePassword`. **Auth does not mint loginIds** — the `generateLoginId()` pure
  helper lives where employees are created (**S05**, unit-tested there); this module
  only *consumes* the resulting credentials at signin. The seed owns the first `ADMIN`
  only via `signup`/seed, not self-registration.
- **ADR-010 envelope.** Every response uses `sendSuccess`/the error middleware — no
  raw objects. Validation errors are `400 VALIDATION_ERROR` via the shared schema.
- **Blacklist.** Store the refresh token's `jti` (or the token hash) in Redis with a
  TTL equal to its remaining lifetime on logout; `refresh` checks membership.
- **Signup tx (onboarding).** `prisma.$transaction` creates the `Company` (ADR-016
  defaults) then the first `ADMIN` `User` (+ its linked `Employee`, `mustChangePassword`
  may be false for the self-chosen admin password). If either fails, both roll back.
  Unique-email collisions → `409`; a second attempt once an admin exists → `403
  REGISTRATION_CLOSED`.
- Password never returned; select-exclude `passwordHash` from every response.
- Keep controllers thin; all Prisma access lives in `auth.service.ts`.

## Acceptance criteria
Run and confirm each (api on **:8000**, base path `/api/v1`; export `C=/tmp/cj`):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] **Signup (onboarding, ADR-012):** on a DB with **no admin**, `curl -sc $C -X POST localhost:8000/api/v1/auth/signup -H 'Content-Type: application/json' -d '{"companyName":"Odoo India","adminEmail":"admin@t.com","password":"Passw0rd!","firstName":"Ada","lastName":"Lovelace"}'`
      returns `201` with `success:true`, a `user` (role `ADMIN`, no `passwordHash`),
      a `company`, and `accessToken`, and sets a `dayflow_rt` cookie in `$C`.
- [ ] **Registration closed:** a **second** signup once an admin exists returns
      `403 REGISTRATION_CLOSED` (ADR-012).
- [ ] **Signin by email OR loginId:** `curl -sc $C -X POST localhost:8000/api/v1/auth/signin -H 'Content-Type: application/json' -d '{"identifier":"admin@t.com","password":"Passw0rd!"}'`
      returns `200` + `accessToken`; signing in with a seeded user's **loginId** as
      `identifier` also succeeds; wrong password returns `401 INVALID_CREDENTIALS`.
- [ ] **Change password:** `POST /auth/change-password` (authed) with the right
      `currentPassword` succeeds `200` and **clears `mustChangePassword`**; wrong
      `currentPassword` → `401`.
- [ ] **Refresh:** `curl -sb $C -c $C -X POST localhost:8000/api/v1/auth/refresh` returns `200` with a fresh `accessToken` (reads the cookie, no body).
- [ ] **Logout:** `curl -sb $C -X POST localhost:8000/api/v1/auth/logout` returns `200`; a subsequent `refresh` with the old cookie is rejected (`401`, blacklisted).
- [ ] **Protected route:** calling any `requireAuth` route with no token → `401 UNAUTHORIZED`; with a valid `EMPLOYEE` access token against a `requireRole(['ADMIN','HR'])` route → `403 FORBIDDEN`; with an ADMIN/HR token → passes.
- [ ] **Token verify:** an access token from signin verifies with `verifyAccess` and decodes `{ userId, employeeId, role }`.
- [ ] `docs/API.md §1` updated to the ADR-012 onboarding signup body, email-or-loginId
      signin, `POST /auth/change-password`, and the cookie note.
- [ ] Scope check: only `apps/api/src/modules/auth/*`, the two `lib/*` files, the two
      `middleware/*` files, and `docs/API.md §1` were touched (plus shared schemas if noted).

## On completion (Step 6)
- `build/STATE.md`: set S04 → `DONE`; under "Interfaces produced (detail)" list the
  seven `/auth/*` endpoints, the exported `requireAuth`/`requireRole` signatures and
  their import path (`middleware/auth.ts`), the `req.user` shape, the refresh cookie
  name/attributes, and any shared schema you added. Note S05–S08 can now guard routes.
- `build/logs/S04-log.md`: from `_TEMPLATE.md` — record token TTLs, cookie attrs,
  blacklist strategy, and any deviation from ADR-002/007.

## ▶ Copy-paste prompt
```
You are running build session S04 (Auth Module) for the Dayflow HRMS monorepo. This
is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S04-auth.md (your full spec). Also read docs/API.md §1 and the
   ADR entries it references (ADR-001, 003, 007, 010, and especially ADR-012 which
   makes signup company/admin-onboarding-only, adds email-or-loginId signin +
   change-password, and moves employee creation to S05).
2. Verify the preconditions (S03 DONE, shared auth schemas exist). If anything blocks
   you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s04-auth, build ONLY the
   Deliverables listed in the session file, run every Acceptance criteria command and
   confirm it passes, then update build/STATE.md and write build/logs/S04-log.md, and
   commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S11 + auth guards
   for S05–S08), and the next session to run.

Stay strictly in scope — auth module + the two middleware guards only. When the spec
is ambiguous, follow docs/DECISIONS.md. Begin.
```

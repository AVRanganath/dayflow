# Session Log — S04 Auth Module

- **Session:** S04 — Auth module
- **Agent / model:** Claude Code (Opus 4.8, 1M context)
- **Branch:** feat/s04-auth
- **Status at end:** DONE

## What I built
- `apps/api/src/lib/password.ts` — `hashPassword` / `comparePassword` (bcryptjs, cost 10).
- `apps/api/src/lib/jwt.ts` — `signAccessToken`, `signRefreshToken`, `verifyAccess`,
  `verifyRefresh`. Access 15m, refresh 7d (secrets/expiries from `env`). Access payload
  `{ sub, employeeId, role }`; refresh payload `{ sub, role, jti }`.
- `apps/api/src/lib/response.ts` — `sendSuccess(res, data, status?, meta?)` (ADR-010).
  Created here because the S03 STATE block listed a response helper as existing but no
  such file was on main.
- `apps/api/src/middleware/validate.ts` — `validate(schema)` boundary validation.
  Also missing on main despite the S03 STATE mention; created here.
- `apps/api/src/modules/auth/auth.service.ts` — all logic: signup onboarding tx,
  signin (email OR loginId), change-password, refresh (rotate + blacklist), logout,
  verify-email, forgot/reset password. All Prisma access lives here.
- `apps/api/src/modules/auth/auth.controller.ts` — thin controllers; sets/clears the
  `dayflow_rt` HttpOnly cookie; `asyncHandler` wrapper (Express 4 doesn't forward async
  rejections).
- `apps/api/src/modules/auth/auth.routes.ts` — router at `/api/v1/auth`, tighter rate
  limit (10/60s), `validate(...)` per write boundary, `requireAuth` on change-password.
- `apps/api/src/middleware/auth.ts` — filled the S03 stubs with real `requireAuth`
  (Bearer → `verifyAccess` → `req.user`) and `requireRole(...roles)` (403 on mismatch).
- Wired `router.use('/auth', authRouter)` and added `cookie-parser` to `app.ts`.
- Added deps to `apps/api`: `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ `@types/*`).
- Updated `docs/API.md §1`: signup 201 body (accessToken only + cookie note),
  signin cookie note, refresh/logout are cookie-based with no body.

## Key decisions
- **`req.user` stays `{ id, role }`** (the S03 `AuthUser` stub type), not the
  `{ userId, employeeId, role }` shape the S04 session file mentioned. The coordinator's
  brief explicitly said to keep the exact existing `AuthUser`/`Express.Request.user`
  augmentation and set `req.user = { id, role }`. `employeeId` is carried inside the
  access-token payload instead, so consumers that need it can decode the token or look
  up `Employee` by `userId`. Recorded here for S05–S08.
- **Error codes:** signin uses `AppError(401, 'INVALID_CREDENTIALS')` and closed signup
  uses `AppError(403, 'REGISTRATION_CLOSED')` to match the documented API codes exactly
  (rather than the generic `UNAUTHORIZED`/`FORBIDDEN` from the subclass helpers).
- **Signup admin loginId** is minted inline as `OI` + first-2/first-2 + year + `0001`.
  The general `generateLoginId()` employee helper is owned by S05 (ADR-012); auth only
  needs the single bootstrap admin id.

## Deviations from the session file
- Session file named the router file `auth.route.ts`; used `auth.routes.ts` (coordinator's
  wording). Same for the `authLimiter`: implemented inline on the router via S03's
  `rateLimit({windowSeconds,max})` (10/60s) rather than a separate exported `authLimiter`
  in `rate-limit.ts` — S03 already owns that file and the session said reuse it.
- Created `lib/response.ts` and `middleware/validate.ts` (see above) because they were
  documented as S03 outputs but absent from main. Flagged in STATE.md.
- `req.user` shape deviation from the session file's `{ userId, employeeId, role }`
  (see Key decisions) — followed the coordinator brief + existing S03 type.
- Did not add the optional `auth.test.ts`.

## Gotchas / things that bit me
- `noUncheckedIndexedAccess` makes `req.params.token` `string | undefined` — guard it.
- Express **4** does not forward rejected async-middleware promises to the error
  handler; controllers must be wrapped (`asyncHandler`) and `validate` is kept sync.
- The seeded DB always contains an ADMIN, so the signup **201** happy path can't be
  exercised against it — only the `403 REGISTRATION_CLOSED` gate. The 201 path is
  covered by code + the transaction logic; verify on an empty DB if needed.

## Acceptance criteria result
Ran from the worktree root / against the shared seeded DB on `PORT=8004`:
- `npm run typecheck` → **PASS** (0 errors, all 5 workspaces).
- `npm run lint` → **PASS** (0 errors).
- signin `admin@dayflow.com`/`Admin@123` → **200**, `{ user (ADMIN, no passwordHash),
  accessToken }`, sets HttpOnly `dayflow_rt` cookie. ✔
- signin `john@dayflow.com`/`Employee@123` → **200**. ✔
- signin by **loginId** (`OIJODO20260002`) → **200**. ✔
- signin wrong password → **401 INVALID_CREDENTIALS**. ✔
- signup (valid body) on seeded DB → **403 REGISTRATION_CLOSED**. ✔
- change-password with no token → **401 UNAUTHORIZED**; wrong currentPassword (authed)
  → **401**. ✔ (did not run the mutating happy path to preserve seed creds)
- refresh via cookie → **200** fresh `accessToken`; after logout, replaying the same
  refresh token → **401 "Refresh token has been revoked"** (blacklist works). ✔
- logout → **200**. ✔
- access-token payload decodes `{ sub, employeeId, role }` (verified in the JWT). ✔
- Signup **201** happy path: not exercised (seeded DB always has an ADMIN). Logic
  verified by code review of the `$transaction`.

## Handoff — what's now unblocked / TODO
- **S11 (auth pages)** can build against these endpoints + the cookie contract.
- **S05–S08** can guard routes: `import { requireAuth, requireRole } from '../../middleware/auth.js'`,
  reuse `sendSuccess` (`lib/response.ts`) and `validate` (`middleware/validate.ts`).
- Note for S05: `req.user` is `{ id, role }` only. If you need `employeeId`, look up
  `Employee` by `userId` (or decode the access token payload's `employeeId`).

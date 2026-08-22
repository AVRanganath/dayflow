# S11 — Auth Pages (Sign Up / Sign In)

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S11-log.md` and commit before you finish.

- **Owns:** `apps/web` public auth routes — `/signup` (PAGE 1, **company/admin
  onboarding**), `/signin` (PAGE 2), and the first-login **change-password** flow.
  **Produces:** the authentication screens that establish a session and land the user
  on `/dashboard` (or force a password change first).
- **Depends on:** S10 (web foundation: shell, UI primitives, api client, auth
  store), S04 (auth API: `POST /auth/signup`, `POST /auth/signin`, cookie refresh).
  **Parallel with:** S12, S13, S14, S15.

## Goal
Build the public auth pages exactly as `docs/UI_DESIGN_PROMPT.md` PAGE 1/PAGE 2
describe: the split branding/form layout, all fields, password show/hide + strength
meter, client-side validation via the shared Zod schemas + `react-hook-form`, the
bad-credentials error banner, wired to the real `/auth/signup` and `/auth/signin`
endpoints, storing the session in the S10 auth store and redirecting to
`/dashboard`. Per **ADR-012** there is **no employee self-signup**: `/signup` is
**company/admin onboarding** (first-run only), sign-in accepts email **or** `loginId`,
and a first login with `mustChangePassword` is forced through a **change-password**
screen before reaching `/dashboard`.

## Preconditions
- S10 and S04 are `DONE` in `build/STATE.md`.
- From S10: the api client (`get/post/…`, `ApiError`), the auth store
  (`useAuth().login(session)`), and the UI primitives (`Button`, `Input`,
  `Select`, `Toast`) exist and are exported.
- From S04 (per **ADR-012**): `POST /api/v1/auth/signup` is **company/admin
  onboarding** — allowed only while no `ADMIN` exists (first-run), creating the
  `Company` (name + logo) and the first `ADMIN`; afterwards it returns
  `403 REGISTRATION_CLOSED`. `POST /api/v1/auth/signin` accepts **email or `loginId`**
  + password. `POST /api/v1/auth/change-password` sets a new password and clears
  `mustChangePassword`. All return `{ user:{id,email,role,mustChangePassword}, accessToken }`
  in the envelope and set the HttpOnly refresh cookie (ADR-007). Seed users exist:
  `admin@dayflow.com/Admin@123`, `john@dayflow.com/Employee@123`.
- `@dayflow/shared` exports `OnboardingSchema` (company + admin: company name/logo +
  admin firstName/lastName/email/password), `SigninSchema` (identifier = email OR
  `loginId`, + password), and `ChangePasswordSchema` (current + new + confirm). If any
  is missing, add it to `@dayflow/shared` and note the shared-contract change.
- The api is running on port 8000 and web on 3000 (for the acceptance run).

## Deliverables (exact files)
- **`apps/web/src/app/(auth)/layout.tsx`** — public auth layout implementing the
  split screen from PAGE 1/2: left panel (50% desktop, hidden on mobile) with the
  `linear-gradient(160deg,#714B67,#2F1F2B)` brand gradient, "Dayflow" wordmark
  ("flow" in `#8FC9CC`), the headline "Every workday, perfectly aligned." in
  **Caveat Brush 52px** with the `#F0B93F` marker highlight behind "perfectly
  aligned.", the decorative ring + rotated square, and the Caveat Brush footnote;
  right panel hosts the form.
  This route group sits **outside** the S10 `RequireAuth` guard (public). If the
  user is already authenticated, redirect them to `/dashboard`.
- **`apps/web/src/app/(auth)/signup/page.tsx`** — PAGE 1, **company/admin onboarding**
  (ADR-012: NO employee self-signup). "Set up your company" / "Create your admin
  account": fields **Company Name**, **Company Logo** (upload), and admin details
  **Full Name**, **Work Email**, **Password** (show/hide toggle + strength bar),
  **Confirm Password**. Primary full-width plum (`#714B67`) "Create Company & Admin" button;
  "Already have an account? Sign in" link; ToS footer link. Inline red error text +
  green-check on valid fields. **Shown only for first-run** (no admin yet): if the
  server reports onboarding is closed (`403 REGISTRATION_CLOSED`), show a message and
  send the user to `/signin` (regular users always land on `/signin`). There is **no
  Role select** and **no Employee ID** field here.
- **`apps/web/src/app/(auth)/signin/page.tsx`** — PAGE 2 "Welcome back": subtext
  "Sign in to your Dayflow account"; fields **Email or Login ID** (single identifier
  input, ADR-012), **Password** (show/hide); "Remember me" checkbox + "Forgot
  password?" link on one row; full-width "Sign In" button; onboarding link only when
  first-run. **Red alert banner above the form** on bad credentials: "Invalid
  credentials. Please try again." On success, if `mustChangePassword` is true, route
  to `/change-password` **instead of** `/dashboard`.
- **`apps/web/src/app/(auth)/change-password/page.tsx`** — first-login forced
  **change-password** screen (ADR-012 `mustChangePassword`): **Current Password**
  (the system-generated temp), **New Password** (show/hide + strength), **Confirm New
  Password**. Calls `POST /auth/change-password`; on success clears
  `mustChangePassword` in the auth store and redirects to `/dashboard`. Reachable
  when authenticated with `mustChangePassword=true`; also usable as a normal
  change-password flow.
- **`apps/web/src/features/auth/OnboardingForm.tsx`**, **`.../SigninForm.tsx`**, and
  **`.../ChangePasswordForm.tsx`** — `'use client'` form components using
  `react-hook-form` + `@hookform/resolvers/zod` with the **shared Zod schemas**.
  `OnboardingForm` collects company name + logo and the admin details (splitting "Full
  Name" into `firstName`/`lastName`), enforces password === confirmPassword, and posts
  the onboarding body (multipart if a logo file is sent). `SigninForm` posts a single
  `identifier` (email or `loginId`) + password. `ChangePasswordForm` posts current/new.
  On submit call the matching `api.post('/auth/signup' | '/auth/signin' |
  '/auth/change-password', body)`, then `useAuth().login(...)` with the returned
  session; redirect to `/dashboard`, **except** when the signed-in user has
  `mustChangePassword` → `/change-password` (ADR-012).
- **`apps/web/src/features/auth/PasswordStrength.tsx`** — password strength meter
  (length/upper/lower/digit/symbol → weak/medium/strong bar) used in signup.
- **`apps/web/src/features/auth/password-field.tsx`** (or inline) — reusable
  password input with show/hide eye toggle (wraps the S10 `Input`).

## Implementation notes
- **Validation is the shared Zod schema** — do not hand-roll rules that duplicate
  `@dayflow/shared`. Map Zod field errors to inline messages under each field via
  RHF; the schema is the single source (`plan.md §6`).
- Map API `ApiError` codes to UX: `INVALID_CREDENTIALS` → the red banner on signin;
  `REGISTRATION_CLOSED` on onboarding → a friendly "your company is already set up,
  please sign in" message + redirect to `/signin`; a 409/duplicate on onboarding → an
  inline email error or a banner. Never show a raw stack or code to the user.
- **ADR-012: no employee self-signup.** `/signup` is company/admin onboarding, first-run
  only — there is no Role select and no employee-created accounts here (employees are
  created by Admin/HR in S05/S13). Sign-in identifier accepts **email or `loginId`**.
- **First-login change-password (ADR-012).** When a signed-in user has
  `mustChangePassword=true`, force `/change-password` before `/dashboard`; on success
  clear the flag in the auth store and continue.
- Session storage + refresh is entirely S10's concern — this session only calls
  `login(session)`; do not touch token/cookie plumbing.
- After a successful login the redirect target is always `/dashboard`; the correct
  role dashboard is chosen in S12.
- "Forgot password?" and "Remember me" may be present but can be non-functional
  placeholders in the MVP (note it in the log); focus is signup/signin.
- Reuse S10 primitives (`Button`, `Input`, `Select`, `Toast`) and design tokens —
  match PAGE 1/2 layout, colors, radii exactly. `strict` TS, no `any`, JSDoc.

## Acceptance criteria
Run and confirm each (api on :8000, web on :3000, DB seeded):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] Sign in with `admin@dayflow.com` / `Admin@123` reaches `/dashboard`
      authenticated; sign in with `john@dayflow.com` / `Employee@123` also reaches
      `/dashboard`.
- [ ] **Login by loginId (ADR-012):** signing in with a user's `loginId` + password
      (instead of email) also reaches `/dashboard`.
- [ ] Invalid credentials show the **red banner** ("Invalid credentials…") and do
      **not** navigate.
- [ ] Client-side validation errors render **inline** (empty/short password,
      malformed email, mismatched confirm password) using the shared Zod schema.
- [ ] **Onboarding (ADR-012):** on a fresh DB, `/signup` creates the **company +
      first admin**, logs in, and lands on `/dashboard`; once an admin exists, `/signup`
      shows the "already set up" message / redirects to `/signin` (no employee
      self-signup).
- [ ] **Forced password change (ADR-012):** signing in as a user with
      `mustChangePassword=true` routes to `/change-password`; after a successful change
      the flag clears and the user reaches `/dashboard`.
- [ ] Password show/hide toggle and strength meter work on onboarding + change-password.
- [ ] Visiting `/signin` while already authenticated redirects to `/dashboard`.

## On completion (Step 6)
- `build/STATE.md`: set S11 → `DONE`; under "Interfaces produced (detail)" note the
  routes (`/signup` = onboarding, `/signin`, `/change-password`) and the `(auth)`
  route group, and confirm the login → (optional forced change-password) →
  `useAuth().login()` → `/dashboard` flow works end-to-end against S04 (email-or-loginId).
- `build/logs/S11-log.md`: from `_TEMPLATE.md` — record any ApiError→UX mappings
  (incl. `REGISTRATION_CLOSED`), the onboarding first-run gate + forced
  change-password handling, whether Forgot Password / Remember me were stubbed, and any
  schema mismatch found.

## ▶ Copy-paste prompt
```
You are running build session S11 (Auth Pages) for the Dayflow HRMS monorepo. This
is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md,
   then build/sessions/S11-auth-pages.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md PAGE 1 (Sign Up) + PAGE 2 (Sign In), docs/API.md §1
   (auth), and docs/DECISIONS.md (ADR-012 onboarding/loginId/change-password — NO
   employee self-signup; ADR-001 roles, ADR-007 tokens). Skim the S10 log for the api
   client + auth store + UI primitive names.
2. Verify the preconditions (S10 and S04 DONE; api on :8000, web on :3000, DB
   seeded; SignupSchema + SigninSchema exported from @dayflow/shared). If anything
   blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s11-auth-pages, build ONLY
   the Deliverables — the (auth) split-layout, /signup (company/admin onboarding,
   first-run only), /signin (email-or-loginId), and /change-password (forced on first
   login when mustChangePassword) pages with react-hook-form + the shared Zod schemas,
   password show/hide + strength, the bad-credentials red banner, wired to POST
   /auth/signup, /auth/signin, /auth/change-password and storing the session via
   useAuth().login() then redirecting to /dashboard (or /change-password when
   mustChangePassword). Run every Acceptance criteria command and confirm it passes
   (log in with the two seeded accounts, incl. by loginId), then update build/STATE.md
   and write build/logs/S11-log.md, and commit using Conventional Commits (no AI
   co-author line).
4. Finish with a handoff summary: what's done and what's now unblocked.

Stay strictly in scope — auth pages only; do NOT touch token/cookie plumbing (that's
S10) or build dashboards (S12). Follow docs/UI_DESIGN_PROMPT.md precisely. When the
spec is ambiguous, follow docs/DECISIONS.md. Begin.
```

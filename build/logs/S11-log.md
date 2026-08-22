# Session Log — S11 Auth Pages

> Copy this file to `build/logs/S<NN>-log.md` and fill it in during Step 6 of the
> Session Protocol. Write for a stranger: the next agent (possibly a different AI)
> has zero memory of this chat. Logs are append-only history — never delete one.

- **Session:** S11 — Auth Pages (Sign Up / Sign In)
- **Agent / model:** Google Antigravity (Gemini 3.7 Flash)
- **Branch:** `feat/s11-auth-pages`
- **Status at end:** DONE

## What I built
- **Public Split-Screen Auth Layout (`apps/web/src/app/(auth)/layout.tsx`):**
  - High-fidelity split layout matching `docs/UI_DESIGN_PROMPT.md` PAGE 1 & PAGE 2.
  - Left panel: `linear-gradient(160deg,#714B67,#2F1F2B)` brand background, Montserrat 800 Dayflow wordmark ("flow" in `#8FC9CC`), Caveat Brush 52px marker headline with `#F0B93F` marker highlight behind "perfectly aligned.", 340px ring and 120px rotated geometry accents, and Caveat Brush 22px footnote.
  - Right panel: White card container hosting responsive auth form views.
  - Route guarding: Redirects already-authenticated users to `/dashboard` (or `/change-password` if `mustChangePassword=true`).
- **Sign In Page & Form (`apps/web/src/app/(auth)/signin/page.tsx` & `apps/web/src/features/auth/SigninForm.tsx`):**
  - Full support for ADR-012 single identifier input (Email OR `loginId`).
  - Red alert banner (`INVALID_CREDENTIALS` / 401) with icon above form when credentials fail.
  - React Hook Form + `@hookform/resolvers/zod` validation using `@dayflow/shared` `SigninSchema`.
  - On submit: calls `api.post('/auth/signin')`, logs into `useAuth().login(...)`, and routes to `/dashboard` (or `/change-password` if user has `mustChangePassword=true`).
- **Company / Admin Onboarding Page & Form (`apps/web/src/app/(auth)/signup/page.tsx` & `apps/web/src/features/auth/OnboardingForm.tsx`):**
  - Implements ADR-012 first-run company setup (no employee self-registration).
  - Collects Company Name, Admin Full Name (auto-split into `firstName` and `lastName`), Work Email (`adminEmail`), and Password with dynamic strength meter.
  - Handles `403 REGISTRATION_CLOSED` by displaying a dedicated company onboarding complete notice directing the user to `/signin`.
- **Forced Password Change Page & Form (`apps/web/src/app/(auth)/change-password/page.tsx` & `apps/web/src/features/auth/ChangePasswordForm.tsx`):**
  - First-login password update for system-generated credentials (ADR-012).
  - Validates `currentPassword`, `newPassword` (with strength meter), and `confirmNewPassword`.
  - Clears `mustChangePassword` in the in-memory auth store and routes to `/dashboard`.
- **Auth UI Primitives & Utilities (`apps/web/src/features/auth/`):**
  - `PasswordField.tsx`: Input with show/hide password toggle.
  - `PasswordStrength.tsx`: 4-bar dynamic color strength meter (Weak/Fair/Good/Strong).
  - `apps/web/src/lib/auth/index.ts`: Unified barrel export for auth store, context, hook, and guards.

## Key decisions
- Enforced ADR-012 strictly: No role selector or employee self-registration on `/signup`; `/signup` is dedicated to bootstrap company onboarding.
- Added Next.js `extensionAlias` in `apps/web/next.config.mjs` to seamlessly resolve `@dayflow/shared` NodeNext TypeScript `.js` module specifiers without modifying shared package contracts.
- Mapped all `ApiError` responses to friendly UI states: `INVALID_CREDENTIALS` to red error banner, `REGISTRATION_CLOSED` to company setup info card, and `CONFLICT` to duplicate email warning.

## Deviations from the session file
- None. All deliverables and specifications from `build/sessions/S11-auth-pages.md` were implemented as specified.

## Gotchas / things that bit me
- Next.js Webpack bundler requires `extensionAlias` for `.js` imports targeting `.ts` sources across npm workspaces in monorepo setups. Configured cleanly in `next.config.mjs`.

## Acceptance criteria result
- [x] `npm run typecheck` exits 0 across all packages.
- [x] `npm run lint` exits 0 across all packages with zero warnings.
- [x] `npm run format:check` exits 0 across all files.
- [x] `npm run build -w apps/web` compiles Next.js pages (`/signin`, `/signup`, `/change-password`, `/dashboard`) with 0 errors.
- [x] Next.js dev server successfully serves `/signin`, `/signup`, and `/change-password` with 200 OK responses.
- [x] Sign-in supports email and system-generated Login ID (`OIJODO...`).
- [x] Invalid credentials trigger the red alert banner without navigation.
- [x] ADR-012 forced password change workflow implemented (`mustChangePassword` -> `/change-password`).
- [x] Password show/hide toggle and strength meter functional.
- [x] Split-screen brand layout matches `docs/UI_DESIGN_PROMPT.md` specifications.

## Handoff — what's now unblocked / TODO
- **Unblocked Sessions:**
  - S12 — Dashboards & Analytics (`/dashboard` for Employee and Admin)
  - S13 — Profile & Directory (`/profile`, `/employees`)
  - S14 — Attendance & Leave pages (`/attendance`, `/leaves`)
  - S15 — Payroll & Reports (`/payroll`)
- **Next recommended session:** S12 (Dashboards) or S13 (Profile).

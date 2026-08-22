# S10 — Web Foundation (Next, Tailwind, design system, api client, auth)

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S10-log.md` and commit before you finish.

- **Owns:** `apps/web` foundation — Next.js scaffold, design system, api client,
  auth store, app shell, UI primitives. **Produces:** a running Next 14 app at
  `localhost:3000` that every feature page (S11–S15) is built on.
- **Depends on:** S02 (shared Zod schemas + types). **Unblocks:** S11, S12, S13,
  S14, S15.

## Goal
Turn the minimal `apps/web` package (stubbed in S00) into a real Next.js 14 App
Router app: the `docs/UI_DESIGN_PROMPT.md` **Global Design System** wired into
Tailwind + `globals.css`, a typed API client that speaks the `docs/API.md`
envelope and auto-refreshes tokens per ADR-007, an in-memory auth store with
route protection, the shared app shell (dark plum sidebar + header, responsive),
and the 11 reusable UI primitives. **No feature pages** — those are S11–S15. This
session builds the platform they all stand on.

## Preconditions
- S00 and S02 are `DONE` in `build/STATE.md`. `@dayflow/shared` exports the Zod
  schemas + inferred types (SignupSchema, SigninSchema, Role, LeaveType,
  AttendanceStatus, envelope types).
- `npm install` works at the root; `NEXT_PUBLIC_API_URL` exists in
  `apps/web/.env.local.example` (default `http://localhost:8000/api/v1`).
- You are on latest `main`. Node 18+. (The api need not be running for this
  session; you build against types, not a live server.)

## Deliverables (exact files)
- **Next scaffold in `apps/web`.** Run the real Next 14 App Router + TS + Tailwind
  scaffold *into the existing package* (do not create a sibling dir). Result:
  `apps/web/next.config.mjs`, `apps/web/tsconfig.json` (extends `@dayflow/config`
  base, `paths` for `@/*` → `src/*`), `apps/web/postcss.config.mjs`,
  `apps/web/tailwind.config.ts`, `apps/web/src/app/layout.tsx` (root), and a
  placeholder `apps/web/src/app/page.tsx` that redirects to `/dashboard`. Keep the
  package name `@dayflow/web`; keep `@dayflow/shared` as a workspace dep. `dev`
  script must run on **port 3000**.
- **`apps/web/tailwind.config.ts`** — encode the Global Design System from
  `docs/UI_DESIGN_PROMPT.md` as theme tokens:
  - colors: `primary` `#714B67`, `primary-hover` `#5B3C53`, `sidebar` `#2F1F2B`,
    `primary-tint` `#F4EEF3`, `primary-tint-border` `#D6C4D1`,
    `secondary` `#017E84`, `secondary-tint` `#E0F0F1`, `secondary-on-dark` `#8FC9CC`,
    `accent` `#F0B93F`, `success` `#10B981`, `warning` `#F59E0B`, `danger` `#EF4444`,
    `background` `#F5F6F7`, `card` `#FFFFFF`, `zebra` `#FAFAFB`, `border` `#DEE2E6`,
    `hairline` `#EDEFF1`, `text-primary` `#383E45`, `text-secondary` `#6C757D`,
    `text-muted` `#98A0A8`, `text-disabled` `#CED4DA`. Each semantic color also needs
    its `-dark` and `-tint` step where the spec lists one (success/warning/danger),
    plus the 8-color `avatar` palette as an array-ish scale.
  - borderRadius: `sm` `3px`, `DEFAULT`/`card`/`btn` `4px`, `container` `6px`,
    `pill` `99px`.
  - boxShadow: `card` `0 1px 2px rgba(0,0,0,0.04)`, `hero` `0 4px 16px rgba(47,31,43,0.25)`,
    `auth` `0 10px 40px rgba(47,31,43,0.12)`, `modal` `0 20px 60px rgba(0,0,0,0.25)`.
  - fontFamily: `sans` → Roboto, `display` → Montserrat, `marker` → Caveat Brush.
- **`apps/web/src/app/globals.css`** — Tailwind base/components/utilities, the
  three fonts (Roboto 300/400/500/700, Montserrat 600/700/800, Caveat Brush — all
  via `next/font/google` in `layout.tsx`, exposed as CSS vars used here), body
  background `#F5F6F7`, text `#383E45`, base focus ring
  (`outline:2px solid #714B67; outline-offset:-1px`) + scrollbar polish.
- **`apps/web/src/lib/api/client.ts`** — typed fetch wrapper:
  - base URL from `process.env.NEXT_PUBLIC_API_URL`.
  - attaches `Authorization: Bearer <accessToken>` from the auth store (in memory).
  - sends `credentials: 'include'` so the HttpOnly refresh cookie rides along.
  - **unwraps the envelope** (`docs/API.md`): returns `data` on success; on
    `{ success:false, error }` throws a typed `ApiError { code, message, details }`.
  - **auto-refresh on 401** per ADR-007: on a 401 (except for `/auth/*`), call
    `POST /auth/refresh` (cookie-based, empty body) once, store the new access
    token, and retry the original request exactly once; if refresh fails, clear
    auth and redirect to `/signin`. Guard against refresh loops (single-flight).
  - typed helpers `get/post/put/patch/del<T>(path, body?)` generic over the
    response `data` shape.
- **`apps/web/src/lib/api/types.ts`** (or reuse `@dayflow/shared`) — the envelope
  types + `ApiError` class. Prefer importing shared types; only add web-only glue.
- **`apps/web/src/lib/auth/`** — auth context/store:
  - `auth-store.ts`: access token in memory + `user { id, email, role }`; setters
    `setSession`, `clearSession`, `getAccessToken`. Not persisted to
    localStorage (token is memory-only; refresh cookie restores the session).
  - `AuthProvider.tsx`: React context; on mount, attempts a silent
    `POST /auth/refresh` + `GET /employees/me` to rehydrate; exposes
    `{ user, isLoading, isAuthenticated, login(session), logout() }`.
  - `useAuth()` hook.
  - `route-guard`: a `(protected)` route-group layout (or a `RequireAuth`
    wrapper) that redirects unauthenticated users to `/signin`, and a
    `RequireRole` helper for admin-only areas. Public routes (`/signin`,
    `/signup`) stay outside the guard.
- **`apps/web/src/components/layout/`** — the shared app shell:
  - `Sidebar.tsx` — dark plum (`#2F1F2B`), 260px, Dayflow wordmark (white, "flow" in `#8FC9CC`),
    Lucide nav items with active-state highlight, divider, Settings + Logout,
    user avatar + name + role badge at the bottom. Nav item set differs by role
    (employee vs admin per PAGE 3/4) — drive from a config array keyed by role.
  - `Header.tsx` — page title + greeting slot on the left; notification bell
    (red-dot badge) + avatar dropdown (with logout) on the right.
  - `AppShell.tsx` — composes Sidebar + Header + `<main>`; **responsive** per UI
    spec: desktop full sidebar; tablet (768–1279px) collapsible/hamburger;
    mobile (<768px) bottom-nav bar instead of sidebar.
- **`apps/web/src/components/ui/`** — the 11 reusable primitives from
  UI_DESIGN_PROMPT "Reusable Components" (typed props, JSDoc, design tokens):
  `Button.tsx` (variants: primary/secondary/outline/ghost/danger, sizes, loading
  + disabled), `Input.tsx` / `Select.tsx` / `Textarea.tsx` (label, helper text,
  **error state** in red, required marker), `StatusBadge.tsx` (color-coded pill:
  pending/approved/rejected, present/absent/half-day/leave, active/inactive),
  `DataTable.tsx` (typed columns, zebra striping, row actions, empty slot,
  optional pagination footer), `Modal.tsx` (`shadow-md`, backdrop, close on
  esc/overlay, focus-trap), `Avatar.tsx` (circle, image or initials fallback),
  `EmptyState.tsx` (illustration/icon + text + optional action), `Toast.tsx`
  (success/error/warning + a `ToastProvider`/`useToast`), `ProgressBar.tsx`
  (value/max, color prop — for leave balance/attendance), `StatsCard.tsx` (icon,
  number, label, trend indicator). Export all from
  `apps/web/src/components/ui/index.ts`.
- **`apps/web/src/lib/format.ts`** — small shared formatters: `formatINR` (₹ with
  thousands separators, ADR-008), `formatHours`, `formatDate`, `initials`.

## Implementation notes
- Follow `docs/UI_DESIGN_PROMPT.md` **precisely** for colors, radii, shadows, and
  spacing (20–24px card padding, 20–24px grid gaps, 32px page padding). The style bar
  is Odoo-inspired: plum + teal on near-neutral grays, hairline borders, flat tints,
  minimal motion. `UI/README.md` and the `UI/*.dc.html` prototypes are the built
  reference — read the matching screen before building it, but do not port the inline
  styles or `support.js`.
- App Router only (no `pages/`). Server Components by default; mark interactive
  pieces (`AuthProvider`, forms, dropdowns, toasts) `'use client'`.
- Icons: **Lucide** (`lucide-react`). Charts are **not** in this session (S12).
- Token handling follows **ADR-007**: access token in memory (never localStorage),
  refresh via the HttpOnly cookie at `POST /auth/refresh`, `credentials:'include'`
  on every request. The envelope is **ADR-010** (`{success,data,meta}` /
  `{success,error:{code,message,details}}`) — the client is the single place that
  unwraps it; pages never see `success`.
- Currency is **INR** (ADR-008) — `formatINR` everywhere money renders.
- `strict` TS, **no `any`**. Reuse `@dayflow/shared` types; never redefine a shared
  type in web. JSDoc every exported component/function (`plan.md §6`).
- Do **not** build feature pages, charts, or wire real business endpoints here — a
  bare `/dashboard` placeholder proving the shell + guard render is enough; S12
  replaces it.
- If the shared package is missing a type you need, note it in `STATE.md`
  "Blockers/notes" and add the smallest web-local type rather than editing S02's
  files.

## Acceptance criteria
Run and confirm each:
- [ ] `npm install` still succeeds at the root (new web deps resolve in the
      workspace).
- [ ] `npm run typecheck` and `npm run lint` exit 0 (web included, `strict`,
      no `any`).
- [ ] `npm run dev -w apps/web` serves `http://localhost:3000` with no console
      errors; the app shell (sidebar + header) renders.
- [ ] Hitting a protected route (e.g. `/dashboard`) while unauthenticated
      **redirects to `/signin`**.
- [ ] Design tokens render: spot-check a `<Button variant="primary">` (plum
      `#714B67`, radius 4px) and a `<StatsCard>` (card radius 4px, `shadow-card`)
      on a scratch/placeholder view. Caveat Brush loads (greeting slot renders in
      marker type, not a fallback serif).
- [ ] The api client **compiles against `@dayflow/shared` types** and the
      `docs/API.md` envelope (typecheck proves it; no live api call required).
- [ ] No feature pages, charts, or business endpoints were added (scope check).

## On completion (Step 6)
- `build/STATE.md`: set S10 → `DONE`; under "Interfaces produced (detail)" list the
  api client helpers (`get/post/put/patch/del`, `ApiError`), the auth surface
  (`AuthProvider`, `useAuth`, `RequireAuth`/`RequireRole`), the `ui/index.ts`
  primitive exports, `AppShell`/`Sidebar`/`Header`, the Tailwind token names
  (`primary`, `sidebar`, `rounded-card`, `shadow-sm`, …), and `format.ts` helpers —
  so S11–S15 can import without re-reading the code. Note the dev port (3000) and
  `NEXT_PUBLIC_API_URL` default.
- `build/logs/S10-log.md`: from `_TEMPLATE.md` — record the Next scaffold approach,
  any tokens that deviated from the spec, and refresh-flow gotchas.

## ▶ Copy-paste prompt
```
You are running build session S10 (Web Foundation) for the Dayflow HRMS monorepo.
This is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md,
   then build/sessions/S10-web-foundation.md (your full spec). Also read
   docs/UI_DESIGN_PROMPT.md (Global Design System + Reusable Components),
   UI/README.md (the built design handoff — tokens, per-screen anatomy, state model),
   docs/API.md (response envelope), and docs/DECISIONS.md (ADR-007 tokens, ADR-008 INR,
   ADR-010 envelope).
2. Verify the preconditions (S02 DONE, @dayflow/shared exports the schemas/types,
   NEXT_PUBLIC_API_URL set). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s10-web-foundation, build
   ONLY the Deliverables listed in the session file — scaffold Next 14 into apps/web,
   the Tailwind/globals design tokens, the typed api client (envelope + ADR-007
   refresh), the auth store + route guard, the app shell, and the 11 UI primitives.
   Run every Acceptance criteria command and confirm it passes, then update
   build/STATE.md and write build/logs/S10-log.md, and commit using Conventional
   Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's now unblocked (S11–S15), and
   the next session to run.

Stay strictly in scope — NO feature pages, NO charts, NO real business endpoints
(a bare /dashboard placeholder proving the shell + guard is enough). Follow
docs/UI_DESIGN_PROMPT.md precisely for colors/radii/shadows, and check the built
prototypes in UI/ for anything the spec leaves ambiguous. When the spec is still
ambiguous, follow docs/DECISIONS.md. Begin.
```

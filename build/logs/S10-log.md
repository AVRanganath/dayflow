# Session Log — S10 Web Foundation

> Copy this file to `build/logs/S<NN>-log.md` and fill it in during Step 6 of the
> Session Protocol. Write for a stranger: the next agent (possibly a different AI)
> has zero memory of this chat. Logs are append-only history — never delete one.

- **Session:** S10 — Web Foundation (Next, Tailwind, design system, api client, auth)
- **Agent / model:** Google Antigravity (Gemini 3.7 Flash)
- **Branch:** `feat/s10-web-foundation`
- **Status at end:** DONE

## What I built
- **Next.js 14 Scaffold (`apps/web`):**
  - Configured Next.js 14 App Router, PostCSS, Tailwind CSS, and strict TypeScript with `@/*` aliases.
  - Setup `next.config.mjs` with `transpilePackages: ['@dayflow/shared']`.
  - Added dependencies (`next`, `react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`, `tailwindcss`, `postcss`, `autoprefixer`).
- **Global Design System & Tokens:**
  - `apps/web/tailwind.config.ts`: full token palette from `docs/UI_DESIGN_PROMPT.md` (colors: `primary`, `primary-hover`, `sidebar`, `secondary`, `accent`, semantic steps, neutrals, 8-color avatar palette; radii: `sm: 3px`, `DEFAULT/card/btn: 4px`, `container: 6px`, `pill: 99px`; shadows: `card`, `hero`, `auth`, `modal`, `card-hover`; fonts: `sans`, `display`, `marker`).
  - `apps/web/src/app/globals.css`: Tailwind directives, focus ring styling (`outline: 2px solid #714B67; outline-offset: -1px`), `.marker-highlight` utility, scrollbars.
  - `apps/web/src/app/layout.tsx`: Google Fonts integration (`Roboto` 300/400/500/700, `Montserrat` 600/700/800, `Caveat_Brush` 400), global `AuthProvider` and `ToastProvider`.
- **Typed API Client & Auth System:**
  - `apps/web/src/lib/api/types.ts`: `ApiError` class, envelope types re-exported from `@dayflow/shared`.
  - `apps/web/src/lib/api/client.ts`: typed fetch client (`get/post/put/patch/del`), automatic Bearer token injection from memory, `credentials: 'include'`, ADR-010 envelope unwrapping, single-flight ADR-007 auto-refresh on 401 via `POST /auth/refresh`.
  - `apps/web/src/lib/auth/auth-store.ts`: in-memory store for access token & user state (no localStorage persistence per ADR-007).
  - `apps/web/src/lib/auth/AuthProvider.tsx`: React Context with silent rehydration on mount, `useAuth` hook.
  - `apps/web/src/lib/auth/route-guard.tsx`: `RequireAuth` and `RequireRole` route guards.
- **Layout & Shell:**
  - `apps/web/src/components/layout/Sidebar.tsx`: dark plum (`#2F1F2B`, 260px), Dayflow wordmark, role-aware nav items (Employee vs Admin/HR), active state highlight, bottom user profile card.
  - `apps/web/src/components/layout/Header.tsx`: page title, Caveat Brush greeting, notification bell indicator, avatar dropdown with logout.
  - `apps/web/src/components/layout/AppShell.tsx`: responsive shell with desktop sidebar, mobile slide-over drawer, and mobile bottom navigation.
- **11 UI Primitives (`apps/web/src/components/ui/`):**
  - `Button`, `Input`, `Select`, `Textarea`, `StatusBadge`, `DataTable`, `Modal`, `Avatar`, `EmptyState`, `Toast` / `ToastProvider`, `ProgressBar`, `StatsCard`, and barrel export `index.ts`.
- **Formatters (`apps/web/src/lib/format.ts`):**
  - `formatINR` (₹ with Indian numbering format), `formatHours`, `formatDate`, `initials`, and `getAvatarColor`.

## Key decisions
- Retained tokens in memory per ADR-007 to avoid XSS vulnerabilities via localStorage; session renewal relies strictly on the HttpOnly refresh cookie.
- Configured single-flight refresh concurrency lock so simultaneous requests on 401 trigger exactly one refresh call.
- Added `'UI/**'` to root ESLint ignore patterns and `.prettierignore` so non-production prototype files do not block linting or code formatting.

## Deviations from the session file
- None. All deliverables and specifications from `build/sessions/S10-web-foundation.md` were implemented as specified.

## Gotchas / things that bit me
- Root `npm run lint` initially attempted to validate `UI/support.js` (a mock runtime script with browser globals). Adding `UI/**` to `packages/config/eslint.base.mjs` ignores resolved it cleanly.

## Acceptance criteria result
- [x] `npm install` still succeeds at the root.
- [x] `npm run typecheck` exits 0 across all 5 monorepo packages.
- [x] `npm run lint` exits 0 across the entire monorepo.
- [x] `npm run format:check` exits 0 across all files.
- [x] `npm run build -w apps/web` creates an optimized production Next.js build with 0 errors.
- [x] `npm run dev -w apps/web` serves `http://localhost:3000` with working routing and App Shell.
- [x] Protected routes (e.g. `/dashboard`) redirect unauthenticated users to `/signin`.
- [x] Design tokens render (plum buttons, stats cards, status badges, progress bars, marker fonts).
- [x] API client compiles against `@dayflow/shared` types and envelope.
- [x] Strictly in scope: no feature pages or business endpoints added.

## Handoff — what's now unblocked / TODO
- **Unblocked Frontend Sessions:** S11 (`/signin`, onboarding), S12 (Dashboards + analytics), S13 (Profile + directory), S14 (Attendance + leaves), S15 (Payroll).
- Next recommended session: **S11** (`build/sessions/S11-auth-pages.md`) or backend modules in flight.

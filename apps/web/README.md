# apps/web — Dayflow Frontend (Next.js 14 + Tailwind)

> **Do not free-build here.** This folder is filled by build sessions. See
> `../../build/STATE.md` and `../../build/sessions/`. Foundation lands in **S10**;
> feature pages in **S11–S15**. Follow `../../docs/UI_DESIGN_PROMPT.md` for the
> design system and page-by-page spec.

App Router. Server components fetch through a typed API client that talks to
`apps/api`. Shared request/response types come from `@dayflow/shared` — never
redefine a backend type here. Auth state (access token + role) lives in an auth
context; the refresh token is an HttpOnly cookie handled by the API.

Planned routes (created across sessions):

```text
src/app/
├── (auth)/signin, signup            # S11
├── (dashboard)/dashboard            # S12 (employee + admin variants)
├── (dashboard)/profile, employees   # S13
├── (dashboard)/attendance, leaves   # S14
└── (dashboard)/payroll              # S15
src/lib/api/                         # typed api client (S10)
src/components/                      # design-system components (S10+)
```

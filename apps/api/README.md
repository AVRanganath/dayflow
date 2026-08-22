# apps/api — Dayflow Backend (Express + TypeScript)

> **Do not free-build here.** This folder is filled by build sessions. See
> `../../build/STATE.md` for what exists and `../../build/sessions/` for specs.
> Scaffold lands in **S00/S03**; feature modules in **S04–S09**.

Layered architecture: `route → controller → service → prisma`. Controllers are
thin; business logic lives in services; no Prisma calls in controllers. Every
endpoint validates input with a Zod schema from `@dayflow/shared`. See
`../../docs/API.md` for the endpoint contract and `../../docs/ARCHITECTURE.md` for
middleware, RBAC, and error handling.

Planned layout (created across sessions):

```text
src/
├── server.ts                 # http server bootstrap (S03)
├── app.ts                    # express app + middleware wiring (S03)
├── config/env.ts             # Zod-validated env (S03)
├── lib/                      # errors, logger, prisma client, redis (S03)
├── middleware/               # error, auth (RBAC), rate-limit, request-id (S03/S04)
└── modules/
    ├── auth/                 # S04
    ├── employee/             # S05
    ├── attendance/           # S06
    ├── leave/                # S07
    ├── payroll/              # S08
    └── realtime/             # S09
```

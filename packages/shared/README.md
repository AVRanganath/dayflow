# packages/shared — `@dayflow/shared`

> Filled in **S02**. The one place validation and types are defined so `apps/api`
> and `apps/web` never duplicate them. See `../../build/sessions/S02-shared.md`.

Exports Zod schemas (request/response), the TypeScript types inferred from them,
and shared constants/enums (roles, leave types, attendance statuses, API paths).
Both the backend (boundary validation) and the frontend (form validation + typed
client) import from here.

```text
src/
├── schemas/     # auth, employee, attendance, leave, payroll (Zod)
├── types/       # inferred + shared domain types
├── constants/   # enums, api route paths, pagination defaults
└── index.ts     # barrel export
```

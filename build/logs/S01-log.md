# S01 — Database: Schema, Migrations & Seed (DONE)

## What was built
- Finalized Prisma schema in `packages/db/prisma/schema.prisma` mapping precisely to ADR-012..019, including the `HR` role addition, `Company`, `SalaryStructure`, and `PayrollRecord` snapshots.
- Bootstrapped initial database structure using `npx prisma migrate dev --name init`.
- Rewrote `packages/db/src/index.ts` to export a single, typed `PrismaClient` singleton and re-export all `@prisma/client` types.
- Authored a comprehensive python-style (via Typescript) pseudo-random `seed.ts` providing an idempotent dataset (30 employees, 5 departments, last 3 months of robust Attendance and Payroll records).

## Key Decisions / Deviations
- Used pseudo-random number generator algorithm with a fixed seed inside `seed.ts` to ensure idempotency.
- Computed basic percentages precisely matching ADR defaults and ensured net salaries are logically correlated to working/payable days inside `seed.ts`.
- Manually pinned `@types/bcryptjs` and `bcryptjs` as `devDependencies` in `@dayflow/db` purely for hashing passwords during seeding since S00 did not include them there.
- Encountered a docker restart reset midway requiring a redeployment but `seed.ts` successfully handled incremental deployment.

## Gotchas
- Be aware that `prisma studio` command needs `npx` context if not run via npm script wrapper, and `DATABASE_URL` needs to point correctly.
- Postgres socket/docker permissions needed adjusting in Linux. Sudo password required for native start but got resolved.

## Handoff TODOs
- Hand off to S02 and S03.
- `apps/api` should now easily `import { prisma, Role, ... } from '@dayflow/db'`.

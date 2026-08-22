# S02 — Shared Package: Zod Schemas, Types & Constants

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S02-log.md` and commit before you finish.

- **Owns:** `packages/shared`. **Produces:** the single source of truth for request/
  response Zod schemas, inferred TS types, enums, route constants, and the API
  envelope types — imported by both `apps/api` and `apps/web` as `@dayflow/shared`.
- **Depends on:** S00. **Unblocks:** S03, S10 (runs in parallel with S01).

## Goal
Encode every module's contract once, in Zod, so api and web never duplicate a type.
Schemas match `docs/API.md` request/response shapes as amended by `docs/DECISIONS.md`
(ADR-002 signup, ADR-004 leave types, ADR-008 INR, ADR-010 envelope). No runtime app
code — pure schemas, types, and constants.

## Preconditions
- S00 is `DONE` in `build/STATE.md`; `packages/shared` exists with a `package.json`
  (`@dayflow/shared`), `tsconfig.json` (extends base), and `zod` as a dependency.
- You are on latest `main`. (Does not depend on S01 — may run in parallel.)

## Deliverables (exact files)
Organize under `packages/shared/src/` (kebab-case files), each exporting Zod schemas
**and** their `z.infer` types:
- `src/constants.ts` — enums mirrored from the Prisma schema as string-literal
  const/enums: `Role` (`ADMIN`,`HR`,`EMPLOYEE` — ADR-001), `LeaveType`
  (`PAID`,`SICK`,`UNPAID`,`CASUAL`,`MATERNITY`,`PATERNITY` — ADR-004),
  `AttendanceStatus` (`PRESENT`,`ABSENT`,`HALF_DAY`,`ON_LEAVE` — ADR-005),
  `LeaveStatus` (`PENDING`,`APPROVED`,`REJECTED`), `PayrollStatus`
  (`DRAFT`,`PROCESSED`,`PAID`), `MaritalStatus` (`SINGLE`,`MARRIED`,`OTHER` — ADR-015),
  and `WorkStatus` (`PRESENT`,`ABSENT`,`ON_LEAVE` — ADR-017, computed work-status
  indicator). Plus `API_ROUTES` path constants (base `/api/v1`, and
  every path from `docs/API.md`), pagination defaults (`DEFAULT_LIMIT = 20`,
  `MAX_LIMIT`), and the currency constant (`CURRENCY = 'INR'` — ADR-008).
- `src/envelope.ts` — the fixed API envelope (ADR-010): generic `SuccessResponse<T>`
  (`{ success: true, data: T, meta?: { nextCursor?: string | null; total?: number;
  limit?: number } }`) and `ErrorResponse` (`{ success: false, error: { code: string;
  message: string; details?: unknown } }`), plus a `PaginationQuerySchema`
  (`cursor?`, `limit?` defaulting to `DEFAULT_LIMIT`, capped at `MAX_LIMIT`).
- `src/auth.schema.ts` — **ADR-012** onboarding + credentials:
  `SignupSchema` = company/admin onboarding body
  `{ companyName, adminEmail, password, firstName, lastName }`
  (`password.min(8)`, `.email()` on `adminEmail`, name `.min(2)`); `SigninSchema`
  accepts **email OR loginId** (`{ identifier, password }`, or an
  `{ email?|loginId?, password }` refinement requiring exactly one); `ChangePasswordSchema`
  (`{ currentPassword, newPassword: z.string().min(8) }`, ADR-012 clears
  `mustChangePassword`); `RefreshSchema` (`{ refreshToken }`).
- `src/employee.schema.ts` — `UpdateProfileSchema` (self-editable subset only, per
  ADR-015: `address?`, `phone?`, `personalEmail?`, `profilePicture?`, resume fields —
  all optional, `.strict()`); `AdminUpdateEmployeeSchema` (all editable + the expanded
  ADR-015 profile fields: `maritalStatus?`, `nationality?`, `panNumber?`, `uanNumber?`,
  `employeeCode?`, `workingDaysPerWeek?`, bank details, `managerId?`, plus
  `firstName?`, `lastName?`, `departmentId?`, `designation?`); and
  `CreateEmployeeSchema` (**ADR-012 admin employee-create** — the fields the server
  needs to mint a `User`+`Employee`; `loginId`/temp password are server-generated, not
  in the body).
- `src/attendance.schema.ts` — `CheckInSchema` (`{ location: z.string(),
  ipAddress: z.string().ip() }`; ipAddress usually inferred server-side).
- `src/leave.schema.ts` — `ApplyLeaveSchema` (**ADR-004**: `type: z.enum(LeaveType)`,
  `startDate`/`endDate` as `z.string().datetime()`, `reason.min(10)`, plus optional
  `attachmentUrl?` for a sick-leave certificate — **ADR-018**), `RejectLeaveSchema`
  (`{ reason: z.string().min(5) }`), and `AllocateLeaveSchema` (**ADR-018** admin/HR
  allocation: `{ employeeId, type: z.enum(LeaveType), totalAllowed: z.number().int().nonnegative(), year? }`).
- `src/payroll.schema.ts` — `SalaryStructureSchema` (**ADR-013**: `{ wage:
  z.number().positive() }` plus optional component/rate overrides; amounts INR — ADR-008).
  The old `base/allowances/deductions` shape is replaced by the Wage-driven structure.
- `src/company.schema.ts` — `UpdateCompanySchema` (**ADR-016**: `name?`, `logoUrl?`,
  and a `settings?` object for PF %s, professional tax, component defaults,
  `workingDaysPerWeek`), for `PUT /company` (ADMIN-only).
- `src/index.ts` — **barrel** re-exporting everything above.

## Implementation notes
- **Single source of truth.** Every type is `z.infer<typeof Schema>` — never hand-write
  a duplicate interface. `apps/api` validates with these; `apps/web` reuses the types.
- Where `docs/API.md` still shows the old shape (e.g. signup without `employeeId`,
  leave `ANNUAL`, `USD`), the **ADR wins** — encode the ADR version. The owning
  backend session will realign `docs/API.md` prose later.
- Enums: prefer `z.enum([...] as const)` with the values matching the Prisma enums
  exactly (same casing) so api ↔ db line up.
- Keep it **types + validation only** — no express, no prisma, no network code.
- **Pure helpers (optional here).** The `loginId` format (ADR-012 `generateLoginId`)
  and the salary component math (ADR-013 `computeSalary(wage, cfg)`) are pure functions
  reused by seed (S01), auth/employee (S04/S05), and payroll (S08). If placed here they
  must stay dependency-free (no prisma/express); otherwise the owning module defines
  them — note which you chose in your log so the consumers know the import path.
- Follow `plan.md §6`: strict TS, no `any`, JSDoc on each exported schema/type.

## Acceptance criteria
Run and confirm each:
- [ ] `npm run typecheck -w packages/shared` exits 0.
- [ ] `npm run build -w packages/shared` emits `dist/` (JS + `.d.ts`).
- [ ] A scratch check resolves the barrel, e.g.:
      `node -e "const s=require('@dayflow/shared'); console.log(typeof s.SignupSchema, typeof s.API_ROUTES)"`
      prints two `object`s (or run an equivalent `tsx` import) — proves `@dayflow/shared` resolves.
- [ ] `SignupSchema.safeParse({ companyName:'Odoo India', adminEmail:'a@b.com', password:'Passw0rd', firstName:'Jo', lastName:'Do' }).success === true`
      (ADR-012 onboarding body); `SigninSchema` accepts either an email or a loginId
      identifier; `ChangePasswordSchema` requires `newPassword.min(8)`.
- [ ] No app/feature/runtime code was added (scope check).

## On completion (Step 6)
- `build/STATE.md`: set S02 → `DONE`; under "Interfaces produced (detail)" list the
  exported schema names, the enum/route/envelope constants, and note that all types
  are `z.infer` from those schemas. Note S03 and S10 are unblocked.
- `build/logs/S02-log.md`: from `_TEMPLATE.md` — record where you deviated from
  `docs/API.md` in favor of an ADR (signup `employeeId`, leave types, INR, envelope).

## ▶ Copy-paste prompt
```
You are running build session S02 (Shared Package: Zod Schemas, Types & Constants)
for the Dayflow HRMS monorepo. This is a fresh chat with no prior memory — all
context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S02-shared.md (your full spec). Also read docs/API.md and
   docs/DECISIONS.md (ADR-002/004/008/010 and the design-board decisions
   ADR-012/013/015/016/017/018).
2. Verify the preconditions (S00 DONE; packages/shared scaffolded with zod). If
   anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s02-shared, build ONLY the
   Deliverables listed in the session file, run every Acceptance criteria command and
   confirm it passes, then update build/STATE.md and write build/logs/S02-log.md, and
   commit using Conventional Commits (no AI co-author line).
4. Finish with a handoff summary: what's done, what's unblocked (S03, S10), and the
   next session to run.

Stay strictly in scope — Zod schemas, inferred types, and constants only, no runtime
app code. Where docs/API.md and docs/DECISIONS.md disagree, the ADR wins. Begin.
```

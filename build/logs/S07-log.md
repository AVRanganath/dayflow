# Session Log — S07 Leave Module

- **Session:** S07 — Leave module (smart leave engine)
- **Agent / model:** Claude Code (Opus 5)
- **Branch:** feat/s07-leave
- **Status at end:** DONE (code complete; the auth-gated acceptance criteria are
  structurally unverifiable until S04 lands — see "Acceptance criteria result")

## What I built

Under `apps/api/src/modules/leave/` (all new):

- **`leave.routes.ts`** — exports `leaveRouter`. Endpoints, each with
  `requireAuth` (+ `requireRole('ADMIN','HR')` where the contract says Admin):
  - `POST /` (self) — apply. `multer` `.single('file')` runs first so a
    `multipart/form-data` submission with a certificate is parsed; a plain JSON
    body passes through untouched.
  - `GET /me`, `GET /balance/me` — any authenticated role.
  - `GET /`, `POST /allocations`, `PATCH /:id/approve`, `PATCH /:id/reject` —
    ADMIN/HR.
  - Route order matters: `/balance/me` and `/allocations` are declared **before**
    any `/:id` route so they aren't swallowed as an id param. (There is no bare
    `GET /:id` today, but S14/S09 may add one — keep the order.)
- **`leave.controller.ts`** — thin controllers only. Parse with a Zod schema,
  call the service, emit the ADR-010 envelope, `next(err)` on throw. No Prisma.
- **`leave.service.ts`** — all business logic (details under "Key decisions").
  Exports `countWorkingDays`, `applyLeave`, `listMyLeaves`, `listAllLeaves`,
  `approveLeave`, `rejectLeave`, `getMyBalance`, `allocateBalance`.
- **`leave.schema.ts`** — re-exports the `@dayflow/shared` schemas and adds two
  merged list-query schemas (`MyLeaveListQuerySchema`,
  `AdminLeaveListQuerySchema` = `LeaveListQuerySchema` + `PaginationQuerySchema`).
  No schema is defined inline here.
- **`leave.types.ts`** — `BALANCE_TRACKED_LEAVE_TYPES`, `isBalanceTracked()`,
  `LeaveBalanceLine`, `LeaveBalanceSummary`.
- **`leave.hooks.ts`** — the S09 seam (see "Where the S09 hook lives").

Edits outside the module (all minimal, all recorded here):

- `apps/api/src/routes/index.ts` — replaced S03's `// TODO(S07):` comment with
  `router.use('/leaves', leaveRouter);` plus the import. Nothing else touched.
- `apps/api/package.json` — added `multer@^2.2.0` + `@types/multer` (dev).
- `.gitignore` — added `apps/api/uploads/` (runtime upload dir, not source).
- `build/STATE.md` — S07 row → DONE, interfaces block, two "Blockers/notes" items.

## Key decisions

- **`multer@2.x`, not the `1.4.5-lts` line the ecosystem usually pins.** 1.x is
  deprecated and flagged vulnerable by npm; 2.2.0 is the patched major with the
  same API surface for our use. `@types/multer` is still needed (2.x ships no
  bundled `.d.ts`).
- **Attachment storage is local disk**, `apps/api/uploads/leave-attachments/`,
  filename = `randomUUID() + ext`, 5 MB cap. Marked with a `ponytail:` comment in
  `leave.routes.ts` naming the ceiling and the object-store upgrade path. The dir
  is created at import time with `fs.mkdirSync(..., { recursive: true })` and is
  gitignored. **An uploaded file wins over a body `attachmentUrl`** if a request
  somehow carries both.
- **Balance year = `startDate.getUTCFullYear()`, not "current year".** A request
  filed in December for January validates against the year the leave actually
  falls in. `GET /balance/me` still reports the current calendar year, matching
  the API doc.
- **Overlap is type-agnostic.** Any `PENDING`/`APPROVED` leave whose range
  intersects the new one blocks it, regardless of leave type — you can't be on
  two kinds of leave the same day. Rule: `start <= otherEnd && end >= otherStart`.
- **`INSUFFICIENT_LEAVE_BALANCE` is 422**, not 400. The session file offered
  "400/422"; 422 reads as "well-formed but semantically rejected", which is what
  this is. `LEAVE_OVERLAP` and `LEAVE_NOT_PENDING` are 409 as specified.
- **A missing `LeaveBalance` row is treated as `allocated = 0`**, so a
  balance-tracked request from an unallocated employee is rejected rather than
  silently allowed. Admin/HR fix it via `POST /allocations` (ADR-018).
- **The apply-leave body field is `type`, not `leaveType`.** The session file's
  prose says `leaveType`, but `ApplyLeaveSchema` in `@dayflow/shared` (S02) and
  `docs/API.md` §4 both say `type`. Contract wins (AGENTS.md §2) — no shared
  schema was changed. `LeaveRequest.leaveType` remains the *column* name.
- **No `@dayflow/shared` change was needed.** S02's schemas covered every input.
  This session is **not** a shared-contract change.
- `resolveEmployeeId(userId)` (private) maps `req.user.id` (a `User.id`) →
  `Employee.id`. Every module that acts "as the current employee" needs this;
  it is deliberately not hoisted anywhere shared yet — if S05/S06/S08 each end up
  writing it, that's the moment to promote it, not before.

## Balance-decrement transaction approach

`approveLeave` runs one `prisma.$transaction(async (tx) => …)` that:

1. re-fetches the `LeaveRequest` **inside** the transaction,
2. throws `NOT_FOUND` (404) if absent, `LEAVE_NOT_PENDING` (409) if its status is
   no longer `PENDING` — this re-check inside the transaction is what makes a
   concurrent double-approve safe, since the first committed writer flips the
   status and the second aborts,
3. updates `status` / `reviewedById` / `reviewedAt`,
4. and, **only for `PAID`/`SICK`/`CASUAL`** (`isBalanceTracked`), does
   `leaveBalance.update({ used: { increment: totalDays } })` against the
   `[employeeId, leaveType, year]` unique key.

Status change and balance move commit together or not at all (ADR-006). The S09
hook fires *after* the transaction commits, so a rollback can't emit a phantom
"approved" notification. `rejectLeave` is deliberately **not** transactional — it
touches exactly one row and no balance.

## Where the S09 hook lives

`apps/api/src/modules/leave/leave.hooks.ts`:

```ts
export interface LeaveDecisionEvent {
  employeeId: string; leaveId: string;
  status: 'APPROVED' | 'REJECTED'; reason?: string;
}
export function notifyLeaveDecision(_event: LeaveDecisionEvent): void {
  // no-op until S09 lands
}
```

It carries a `// TODO(S09): emit SSE event + create in-app Notification + AuditLog`
comment. `leave.service.ts` calls it at the end of both `approveLeave` and
`rejectLeave` (reject passes `reason`). It is a synchronous no-op returning
`void` — **S09 should keep it non-throwing** (or make the call sites tolerant),
because a notification failure must not roll back an already-committed decision.
No Redis/SSE code was added here, per the session file.

## Deviations from the session file

- Field name `type` over the session file's `leaveType` in the apply body — the
  shared schema and `docs/API.md` both say `type`. Reasoned above.
- 422 (not 400) for `INSUFFICIENT_LEAVE_BALANCE`; the spec allowed either.
- Added a 6th module file, `leave.hooks.ts`. The session file allowed the hook to
  live in the module "or a tiny local stub" — a separate file gives S09 one
  obvious place to edit without touching service logic.
- Added `multer` as a new `apps/api` dependency. Unavoidable for the multipart
  half of ADR-018; flagged in STATE.md.
- **Did not open a PR / push.** The Session Protocol Step 7 says PR-into-main; the
  coordinator for this run explicitly instructed local commit only, branch left
  unpushed and unmerged for human review. Noting it so the next agent isn't
  confused by a DONE row with no PR.

## Gotchas / things that bit me

- **The shared local Postgres had no migrations applied** when this session
  started, despite the container being healthy — `db:seed` failed with `P2021
  The table public.Company does not exist`. Fix: `npm run db:deploy -w @dayflow/db`
  (`prisma migrate deploy` — non-interactive, unlike `db:migrate`), then
  `npm run db:seed`. Also added to STATE.md "Blockers/notes".
- **Root `npm run db:*` scripts don't see `apps/api/.env`.** They proxy straight
  to `prisma`/`tsx` without `--env-file`, so `DATABASE_URL` must be in the shell
  environment: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dayflow?schema=public" npm run db:seed`.
- **Seeded `LeaveBalance.used` is randomized** (`randomInt(0, allowed/3)` in
  `seed.ts`), so don't hard-code expected `used` values in a check — read the
  balance first and assert on the *delta*. My first verification pass failed on
  exactly this.
- **Prisma `Decimal` is not a JS number.** `totalDays`, `totalAllowed`, `used` all
  come back as `Decimal`; `Number(...)` them before arithmetic or comparison.
  `{ increment: leave.totalDays }` accepts the `Decimal` directly, which is fine.
- `npm run typecheck` is Turbo-cached — a passing run may be a replayed log. Use
  `npx turbo run typecheck --force` when you actually need to re-verify.
- Prettier reformats these files on save-check; run `npx prettier --write` on new
  module files before `format:check` or CI will flag them.

## Acceptance criteria result

**Important context:** S04 (auth) is **not** built. `apps/api/src/middleware/auth.ts`
still ships S03's stubs — `requireAuth`/`requireRole` unconditionally
`throw new UnauthorizedError('... not implemented yet (see S04)')`. There is no way
to mint a real bearer token, so **every authenticated request 401s before reaching
a controller**, regardless of whether the code below it is correct. I did **not**
weaken, bypass, or mock the middleware to manufacture passing curl output, and
there is **no fabricated curl output in this log**.

So the criteria split in two. Verified below by calling `leave.service.ts`
directly against the real seeded Postgres (bypassing HTTP + middleware) via a
throwaway `tsx` script, deleted before commit; it was idempotent (ran twice
clean) and restored every row it touched.

### Verified

| # | Criterion | How | Result |
|---|-----------|-----|--------|
| 1 | `npm run typecheck` exits 0 | `npx turbo run typecheck --force` (uncached), exit code captured | **PASS** (0) |
| 2 | `npm run lint` exits 0 | `npm run lint`, exit code captured | **PASS** (0) |
| 3 | (extra) `npm run format:check` | exit code captured | **PASS** (0) |
| 4 | `totalDays` excludes weekends | `countWorkingDays` asserts: Fri→Mon = 2 (not 4), Mon→Tue = 2, Sat→Sun = 0 | **PASS** |
| 5 | Apply → approve reduces balance by the working-day count | Applied PAID 2026-08-24→25 (`totalDays` = 2), approved it, re-read balance: `PAID.used` 6→8, `remaining` 18→16 — exactly `+totalDays` | **PASS** |
| 6 | Over-balance request rejected | SICK 2026-09-01→12-31 against 11 remaining → `INSUFFICIENT_LEAVE_BALANCE`, statusCode 422 | **PASS** (code + status asserted on the thrown `AppError`) |
| 7 | Overlapping request rejected | PAID 2026-08-21→24 vs. the seeded PENDING SICK on 2026-08-22 → `LEAVE_OVERLAP`, statusCode 409 | **PASS** |
| 8 | Reject stores the reason as `reviewerComment` | `rejectLeave(..., 'Insufficient coverage that week')` → `status='REJECTED'`, `reviewerComment` matches, `reviewedById`/`reviewedAt` set; `CASUAL.used` unchanged | **PASS** |
| 9 | `GET /leaves/balance/me` matches seeded rows | `getMyBalance` for John Doe = PAID 24/6/18, SICK 12/1/11, CASUAL 8/1/7 — deep-equals the seeded `LeaveBalance` rows | **PASS** |
| 10 | Allocation creates/updates rows, preserves `used` | `allocateBalance` MATERNITY/90 → new row `used=0`; set `used=5`; re-allocate 120 → same row id, `totalAllowed=120`, **`used` still 5** | **PASS** |
| 11 | Attachment stored and returned | Applied with `attachmentUrl`; the created `LeaveRequest.attachmentUrl` round-trips | **PASS** (the URL path; the multipart path is untested — see below) |
| 12 | Atomicity guard (double-approve) | Re-approving an APPROVED request → `LEAVE_NOT_PENDING`, 409, from the in-transaction re-check | **PASS** |
| 13 | Unknown `:id` → 404 | `approveLeave` on a nonexistent uuid → `NOT_FOUND`, statusCode 404 | **PASS** |
| 14 | UNPAID skips the balance check | UNPAID applied successfully with no `LeaveBalance` row for that type | **PASS** |
| 15 | List endpoints | `listMyLeaves` returns items + `nextCursor`; `listAllLeaves({status:'PENDING'})` filters correctly and joins the employee name | **PASS** |
| 16 | Router actually mounts | Booted the API on PORT=8000: `/api/v1/health` → 200 ok; `POST /api/v1/leaves` → **401 `UNAUTHORIZED "requireAuth is not implemented yet (see S04)"`**; `GET /api/v1/leaves/balance/me` → same 401; `GET /api/v1/leaves/nope/xyz` → 404. Server stopped afterward | **PASS** — routes are registered and `requireAuth` runs ahead of the controllers (which is exactly the block below) |

### Blocked on S04 — NOT verified, not claimed

| Criterion | Why it can't run yet |
|-----------|----------------------|
| The session file's literal `curl` script (apply → approve → re-check balance with `$EMP` / `$ADM` bearer tokens) | No token issuer exists. Every one of those calls returns 401 from the `requireAuth` stub. The **logic** underneath is covered by rows 5–9 above; the **HTTP path** is not. |
| Employee calling `GET /leaves` or approve/reject gets **403** | `requireRole` is a stub that throws **401**, not 403. Correct 403 behavior depends entirely on S04's implementation. RBAC is wired at the route (`requireRole('ADMIN','HR')` on `GET /`, `/allocations`, approve, reject) but cannot be exercised. |
| EMPLOYEE hitting `POST /leaves/allocations` → **403** | Same reason. |
| Actual HTTP status codes / envelope for the success paths (201 on apply, 200 on approve/reject) | Unreachable through middleware. Status codes are set in `leave.controller.ts` (201 apply, 201 allocations, 200 elsewhere) and the error codes map through S03's verified global handler, but end-to-end confirmation waits on S04. |
| Multipart certificate upload storing a file and setting `attachmentUrl` | Needs an authenticated multipart request. The pre-uploaded-URL half of ADR-018 **is** verified (row 11); the disk-write path is code-complete but unexercised. |
| Reject without a `reason` → `VALIDATION_ERROR` | Zod parsing happens in the controller, downstream of `requireAuth`. `RejectLeaveSchema` (min 5 chars) is S02-owned and unit-tested there; the wiring is unverified. |

**Whoever runs S04 should re-run the session file's curl block verbatim** — it is
the outstanding verification for this session, and nothing about it should need
code changes here.

## Handoff — what's now unblocked / TODO

- **S09 (realtime + notifications + audit)** — wire `notifyLeaveDecision` in
  `apps/api/src/modules/leave/leave.hooks.ts`. Signature is final; keep it
  non-throwing (it is called after the approve transaction commits).
- **S14 (attendance + leave pages)** — can build against the `/leaves` contract
  now (routes + response shapes are in STATE.md "Interfaces produced"), but will
  not get past 401 in a browser until S04 ships.
- **S08 (payroll)** may want `countWorkingDays` from `leave.service.ts` for
  ADR-014 payable-days proration rather than writing a second copy.
- **Follow-up owned by nobody yet:** re-run S07's curl acceptance block once S04
  lands (see the blocked table above). Also, if S05/S06/S08 each hand-roll the
  `User.id → Employee.id` lookup, promote `resolveEmployeeId` into a shared
  helper — I deliberately left it private rather than guess at a home for it.
- Branch `feat/s07-leave` is committed **locally only** — not pushed, no PR, not
  merged, per this run's instructions. A human reviews and pushes it.

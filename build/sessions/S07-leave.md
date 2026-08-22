# S07 — Leave Module

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S07-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/leave/`. **Produces:** the smart leave engine —
  apply/list/approve/reject endpoints with balance validation, overlap detection,
  weekend-skipping day counts, atomic balance decrement on approval, an admin/HR
  leave-balance **allocation** endpoint (ADR-018), and sick-leave **attachment**
  support on apply-leave (ADR-018).
- **Depends on:** S03 (API core, middleware, `requireRole`, envelope, error
  classes). **Parallel with:** S04–S06, S08 (disjoint files — different module dirs).

## Goal
Implement the `/leaves` API from `docs/API.md §4` (as amended by ADR-004 and
ADR-006). This is differentiator #4 ("smart leave engine"): server-side balance
validation, overlapping-request rejection, working-day counting that skips
weekends, and a live `LeaveBalance` decrement on approval done **inside one Prisma
transaction**. Leave a clearly-marked hook where S09 will emit the realtime event +
in-app notification.

## Preconditions
- S03 is `DONE` in `build/STATE.md` (Express app, `authenticate` + `requireRole`
  middleware, Zod-validate middleware, `AppError` subclasses, envelope helpers).
- S01 (`LeaveRequest`, `LeaveBalance` tables + seed) and S02 (shared Zod leave
  schemas) are `DONE`; `npm install`, `npm run typecheck` pass on latest `main`.
- Leave enum + balances follow ADR-004: balances tracked for `PAID`, `SICK`,
  `CASUAL`; `UNPAID` is unlimited (no balance check).

## Deliverables (exact files)
- `apps/api/src/modules/leave/leave.routes.ts` — mounts under `/api/v1/leaves`:
  `POST /`, `GET /me`, `GET /`, `PATCH /:id/approve`, `PATCH /:id/reject`,
  `GET /balance/me`, `POST /allocations` (ADMIN/HR, ADR-018). Auth + RBAC +
  Zod-validate middleware wired per endpoint (multipart on `POST /` if a certificate
  file is uploaded — see notes).
- `apps/api/src/modules/leave/leave.controller.ts` — thin controllers; parse request,
  call service, return envelope. No Prisma here.
- `apps/api/src/modules/leave/leave.service.ts` — all business logic (balance check,
  overlap detection, working-day count, atomic approve, plus `allocateBalances`
  (ADR-018 admin allocation) and storing an apply-leave `attachmentUrl`).
- `apps/api/src/modules/leave/leave.schema.ts` — re-exports/uses the Zod schemas from
  `@dayflow/shared` (`ApplyLeaveSchema`, `RejectLeaveSchema`, list-query schema). If a
  needed schema is missing in `@dayflow/shared`, that is a **shared-contract change**:
  add it there and announce it in `STATE.md`/log (do not inline-define in the module).
- `apps/api/src/modules/leave/leave.types.ts` — internal types (e.g. balance summary
  shape) not already in `@dayflow/shared`.
- Register the router in the API's route index (minimal edit to the S03-owned
  `apps/api/src/app.ts` or `routes/index.ts`; record it in Step 6).

## Endpoints (contract)
- `POST /api/v1/leaves` — **EMPLOYEE (self).** Body
  `{ leaveType, startDate, endDate, reason, attachmentUrl? }`. Validates balance
  (skip for `UNPAID`), rejects overlap with the caller's existing `PENDING`/`APPROVED`
  leave, computes `totalDays` excluding weekends, creates a `PENDING` `LeaveRequest`.
  Optionally carries an **`attachmentUrl`** (sick-leave certificate, ADR-018): accept
  either a multipart file upload (store it, set `attachmentUrl`) **or** a pre-uploaded
  URL passed in the body. → `201`.
- `GET /api/v1/leaves/me` — **any auth role.** Caller's own leave history, newest
  first, cursor-paginated.
- `GET /api/v1/leaves` — **ADMIN/HR** (ADR-001). Optional `?status=` filter
  (`PENDING|APPROVED|REJECTED`), cursor-paginated, includes employee name.
- `PATCH /api/v1/leaves/:id/approve` — **ADMIN/HR.** Sets `status=APPROVED`,
  `reviewedById` (= reviewer's Employee id), `reviewedAt=now`; **decrements the
  matching `LeaveBalance.used` by `totalDays`** for that `employeeId`+`leaveType`
  +`year`, **in one `prisma.$transaction`**. Fires the S09 notification hook. → `200`.
- `PATCH /api/v1/leaves/:id/reject` — **ADMIN/HR.** Body `{ reason }` (required).
  Sets `status=REJECTED`, `reviewedById`, `reviewedAt`, `reviewerComment=reason`.
  Fires the S09 notification hook. → `200`.
- `GET /api/v1/leaves/balance/me` — **any auth role.** Returns `PAID`/`SICK`/`CASUAL`
  as `{ allocated, used, remaining }` for the current year (ADR-004). `UNPAID` is
  unlimited and reported as such (or omitted). Must match the seeded balances.
- `POST /api/v1/leaves/allocations` — **ADMIN/HR** (ADR-018). Allocates/updates
  `LeaveBalance` rows for an employee (the board's "Allocation" — e.g. Paid 24, Sick 7).
  Body allocates per `leaveType` for a `year` (upsert the `allocated` value; preserve
  `used`). Creates the `LeaveBalance` rows if absent. → `200`/`201`.

## Implementation notes
- **Layering (plan.md §6).** `route → controller → service → prisma`. No Prisma in
  controllers. Every input parsed with a `@dayflow/shared` Zod schema. Envelope +
  `AppError` from S03.
- **Working-day count.** `totalDays` = count of days from `startDate` to `endDate`
  inclusive **excluding Saturday & Sunday**. Put this in a small pure helper
  (`countWorkingDays`) so it's unit-checkable. Dates are `@db.Date` — normalize to
  date-only (UTC) to avoid off-by-one from timezones.
- **Balance validation.** For `PAID`/`SICK`/`CASUAL`, look up the caller's
  `LeaveBalance` for `leaveType`+current `year`; reject with a 400/422 `AppError`
  (e.g. `INSUFFICIENT_LEAVE_BALANCE`) if `totalAllowed - used < totalDays`. `UNPAID`
  skips this check entirely.
- **Overlap detection.** Reject (`LEAVE_OVERLAP`, 409) if the new range intersects any
  existing `PENDING` or `APPROVED` leave for the same employee (`start <= otherEnd &&
  end >= otherStart`).
- **Atomicity (ADR-006).** Approve's status change **and** the `LeaveBalance.used`
  increment happen inside a single `prisma.$transaction`. Re-check status is
  `PENDING` inside the transaction to avoid double-approval races. Only decrement a
  balance for balance-tracked types (`PAID`/`SICK`/`CASUAL`); `UNPAID` skips it.
- **Guards.** Approve/reject only act on `PENDING` requests (else 409
  `LEAVE_NOT_PENDING`); reviewer must be ADMIN/HR; `:id` not found → 404.
- **S09 hook (do NOT implement realtime here).** After a successful approve/reject,
  call a no-op-safe hook, e.g. `notifyLeaveDecision({ employeeId, leaveId, status,
  reason? })`, exported from this module (or a tiny local stub) with a
  `// TODO(S09): emit SSE event + create in-app Notification + AuditLog` comment. S09
  wires the real implementation; do not add Redis/SSE code in this session.
- **Allocation (ADR-018).** `POST /allocations` **upserts** `LeaveBalance` rows by
  `[employeeId, leaveType, year]`, setting `allocated` and leaving `used` intact (so a
  re-allocation never resets consumed days). Keep this the single write path for
  admin-set balances; it does not touch the smart-engine apply/approve logic above.
- **Attachment (ADR-018).** Apply-leave may carry a sick-leave certificate: accept a
  multipart upload (store the file, e.g. under an uploads dir / object store, and set
  `attachmentUrl`) **or** a pre-uploaded URL in the JSON body. `attachmentUrl` is
  optional and nullable; persist it on the `LeaveRequest`. Do not gate approval on it.
- **Currency/dates.** N/A to leave amounts, but keep all datetimes ISO-8601 UTC.

## Acceptance criteria
Run and confirm each (api running locally, admin + employee tokens from seed):
- [ ] `npm run typecheck` and `npm run lint` exit 0.
- [ ] Apply then approve reduces available balance by the working-day count:
      ```bash
      # apply (2 working days) as employee
      curl -s -X POST localhost:3000/api/v1/leaves \
        -H "Authorization: Bearer $EMP" -H 'Content-Type: application/json' \
        -d '{"leaveType":"PAID","startDate":"2026-08-24","endDate":"2026-08-25","reason":"Family function trip"}'
      # approve as admin, then re-check balance
      curl -s -X PATCH localhost:3000/api/v1/leaves/$LEAVE_ID/approve -H "Authorization: Bearer $ADM"
      curl -s localhost:3000/api/v1/leaves/balance/me -H "Authorization: Bearer $EMP"   # PAID.remaining dropped by 2
      ```
- [ ] Over-balance request is rejected:
      ```bash
      curl -s -X POST localhost:3000/api/v1/leaves -H "Authorization: Bearer $EMP" \
        -H 'Content-Type: application/json' \
        -d '{"leaveType":"SICK","startDate":"2026-09-01","endDate":"2026-12-31","reason":"Way over the allowance"}'
      # → success:false, error.code INSUFFICIENT_LEAVE_BALANCE
      ```
- [ ] Overlapping request is rejected (`error.code` `LEAVE_OVERLAP`, 409) when it
      intersects an existing PENDING/APPROVED leave.
- [ ] Reject without a `reason` returns `VALIDATION_ERROR`; with `{ "reason": "..." }`
      it returns `status: "REJECTED"` and stores the reason as `reviewerComment`.
- [ ] `totalDays` excludes weekends (a Fri→Mon range counts 2, not 4).
- [ ] `GET /leaves/balance/me` matches the seeded `LeaveBalance` rows for the demo
      employee before any new approvals.
- [ ] Employee calling `GET /leaves` (admin list) or approve/reject gets `403`.
- [ ] **Allocation (ADR-018):** `POST /leaves/allocations` as ADMIN/HR (e.g. Paid 24,
      Sick 7) creates/updates the employee's `LeaveBalance` rows; a follow-up
      `GET /leaves/balance/me` for that employee reflects the new `allocated` values
      (and any prior `used` is preserved); EMPLOYEE hitting it → `403`.
- [ ] **Attachment (ADR-018):** applying leave with an `attachmentUrl` (or a multipart
      certificate upload) stores the URL on the `LeaveRequest` and it is returned on
      the created record.

## On completion (Step 6)
- `build/STATE.md`: set S07 → `DONE`; under "Interfaces produced (detail)" list the
  `/leaves` routes (including `POST /allocations`), the apply-leave `attachmentUrl`
  contract, the exported `notifyLeaveDecision` hook signature (so S09 can wire it),
  the `countWorkingDays` helper, and any `@dayflow/shared` schema you added.
  If you added a shared schema, flag it under "Blockers/notes" as a shared-contract
  change.
- `build/logs/S07-log.md`: from `_TEMPLATE.md` — record the balance-decrement
  transaction approach, overlap rule, and exactly where the S09 hook lives.

## ▶ Copy-paste prompt
```
You are running build session S07 (Leave Module) for the Dayflow HRMS monorepo. This
is a fresh chat with no prior memory — all context lives in committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S07-leave.md (your full spec). Also read docs/API.md §4 and
   docs/DECISIONS.md ADR-001/004/006/010/018.
2. Verify the preconditions (S01, S02, S03 are DONE). If anything blocks you, stop and
   tell me.
3. Follow the Session Protocol's seven steps: branch feat/s07-leave, build ONLY the
   Deliverables in the session file (apps/api/src/modules/leave/*, plus the minimal
   route-index registration), run every Acceptance criteria command and confirm it
   passes, then update build/STATE.md and write build/logs/S07-log.md, and commit
   using Conventional Commits (no AI co-author line).
4. Implement the smart leave engine exactly: balance validation (UNPAID unlimited),
   overlap rejection, weekend-skipping totalDays, and an atomic approve (status +
   LeaveBalance decrement in one prisma.$transaction). Add the ADR-018 admin/HR
   allocation endpoint (upsert LeaveBalance, preserve used) and optional apply-leave
   attachmentUrl (multipart or pre-uploaded URL). Leave a clearly-marked S09
   notification hook — do NOT add SSE/Redis code here.
5. Finish with a handoff summary: what's done, what's unblocked (S09, S14), and the
   next session to run.

Stay strictly in scope — only the leave module. When the spec is ambiguous, follow
docs/DECISIONS.md. Begin.
```

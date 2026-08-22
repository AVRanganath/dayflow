# S09 — Realtime + Notifications + Audit

> **Multi-agent note.** Fresh chat, no memory. Do Step 1 of
> `build/SESSION_PROTOCOL.md` first (read `plan.md`, the protocol, `build/STATE.md`,
> then this file). Build only what's listed here. Update `build/STATE.md` +
> `build/logs/S09-log.md` and commit before you finish.

- **Owns:** `apps/api/src/modules/realtime/` + `apps/api/src/modules/notification/`
  + `apps/api/src/modules/audit/`, and the cross-cutting wiring into the hooks
  S05/S06/S07/S08 left. **Produces:** SSE realtime (Redis pub/sub), in-app + email
  notifications, and an audit trail on sensitive mutations (differentiators #1, #3, #6).
- **Depends on:** S04–S08 (the notification/audit hooks those sessions left).
  **Unblocks:** richer S12 (analytics/live dashboards) and S14 (live leave/attendance UX).

## Goal
Turn the hooks left by earlier modules into real behavior: a `GET /api/v1/events`
**SSE** stream backed by **Redis pub/sub** (ADR-009) so it scales across API
instances; a `notify` service that writes an in-app `Notification` and optionally
emails via a pluggable provider (console in dev, ADR-003); and an `audit` helper that
writes `AuditLog` on sensitive mutations (salary edits, approvals, role changes),
wired into the hooks S05/S07/S08 exposed. Plus `GET /notifications/me` and
`PATCH /notifications/:id/read`.

## Preconditions
- S04–S08 are `DONE` in `build/STATE.md`, and each left the named hook this session
  wires (check their logs / "Interfaces produced"):
  - S07 `notifyLeaveDecision({ employeeId, leaveId, status, reason? })`.
  - S08 `auditPayrollUpdate({ actorUserId, employeeId, oldValues, newValues })`.
  - S05 role-change / employee-update hook; S06 attendance-change hook.
- S03 Redis client is available (or add one from the shared config); `REDIS_URL` is
  set. `npm install`, `npm run typecheck` pass on latest `main`.
- **Schema note:** the Prisma schema has `AuditLog` already but **no `Notification`
  model.** This session adds one (see Deliverables) — a **shared-contract change**.

## Shared-contract change (announce loudly)
This session **adds a `Notification` model to `packages/db/prisma/schema.prisma`** and
runs a migration. Because the Prisma schema is a shared contract, you MUST:
- Announce it in `build/STATE.md` "Blockers/notes" and in `build/logs/S09-log.md`.
- Add an ADR to `docs/DECISIONS.md` (e.g. ADR-011 — Notification model) describing the
  fields and that `remaining`-style computed fields are not stored.
- Suggested shape: `Notification { id, userId (FK→User), type (String), title,
  message, entity?, entityId?, isRead Boolean @default(false), createdAt }` with an
  index on `[userId, isRead]`. Wire the `User ||--o{ Notification` relation.

## Deliverables (exact files)
- `packages/db/prisma/schema.prisma` — add the `Notification` model + relation; create
  a migration (`db:migrate` — name it `add_notification`). Regenerate the client.
- `apps/api/src/modules/realtime/sse.ts` — SSE endpoint handler: sets SSE headers,
  registers the client, subscribes (per-user channel) to Redis, writes `data:` frames,
  heartbeats, and cleans up on disconnect.
- `apps/api/src/modules/realtime/pubsub.ts` — thin Redis pub/sub wrapper: a `publish`
  used by services and a subscriber the SSE handler consumes. Separate Redis
  connections for pub vs sub (Redis requirement in subscribe mode).
- `apps/api/src/modules/realtime/realtime.routes.ts` — `GET /api/v1/events` (auth
  required).
- `apps/api/src/modules/notification/notification.service.ts` — `notify(...)`: writes a
  `Notification` row, publishes an SSE event to the user's channel, and optionally
  emails via the provider. This is what the S07 leave hook and others call.
- `apps/api/src/modules/notification/providers/email.provider.ts` — pluggable email
  provider interface + a `console` implementation for dev (ADR-003). Selected by env.
- `apps/api/src/modules/notification/notification.routes.ts` +
  `notification.controller.ts` — `GET /api/v1/notifications/me` (cursor-paginated,
  own only), `PATCH /api/v1/notifications/:id/read` (own only → `isRead=true`).
- `apps/api/src/modules/audit/audit.service.ts` — `writeAudit({ userId, action,
  entity, entityId, oldValues?, newValues?, ipAddress?, userAgent? })` → inserts an
  `AuditLog` row. Never throws into the caller's critical path (log-and-swallow).
- **Wiring (minimal edits into hook sites left by earlier sessions):** replace the
  `TODO(S09)` stubs in S07 (leave approve/reject), S08 (salary update), S05 (role
  change / employee update), S06 (attendance change) with real calls to `notify(...)`,
  `pubsub.publish(...)`, and/or `writeAudit(...)`. Keep each edit minimal and record
  every touched file in Step 6.
- Register the two routers in the API route index (minimal edit to the S03-owned
  index; record it in Step 6).

## Implementation notes
- **SSE, not WebSockets (ADR-009).** One-way server→client is all the MVP needs.
  Auth on the connection (Bearer or the same mechanism S04 uses); each client is
  subscribed to a user-scoped Redis channel (e.g. `events:user:<userId>`). Send a
  periodic heartbeat/comment to keep proxies from timing out.
- **Horizontal scale.** Because delivery goes through Redis pub/sub, an event
  published on API instance A reaches an SSE client connected to instance B. This is
  the property the acceptance test must demonstrate.
- **Emit on the right events (spec 3.5.2).** SSE fires on **leave approve/reject** and
  **attendance changes** so the web reflects immediately without polling. `notify(...)`
  centralizes "write Notification + publish SSE (+ email)" so callers stay one-liners.
- **Provider abstraction stays clean (ADR-003).** Email goes through a small interface
  (`send({ to, subject, body })`); the `console` provider just logs in dev. Swapping in
  a real provider must not touch call sites.
- **Audit on sensitive mutations only** (differentiator #3): salary edits (S08),
  leave approvals/rejections (S07), role changes (S05). Do not audit ordinary reads.
- **Do not re-implement earlier modules.** Only fill the hooks they left; if a hook is
  missing or shaped differently than the precondition says, adapt the wiring minimally
  and note it in the log (do not redesign S05–S08).

## Acceptance criteria
Run and confirm each (api running locally + Redis up; admin + employee tokens):
- [ ] `npm run typecheck` and `npm run lint` exit 0; migration `add_notification`
      applies cleanly (`npm run db:migrate`).
- [ ] SSE stream connects and stays open (auth required — no token → `401`):
      ```bash
      curl -N -s localhost:3000/api/v1/events -H "Authorization: Bearer $EMP"   # holds open, heartbeats
      ```
- [ ] Approving a leave in one client pushes an SSE event **and** creates a
      Notification **and** writes an AuditLog row: with the SSE `curl` above open for
      the employee, in another shell approve that employee's leave as admin —
      ```bash
      curl -s -X PATCH localhost:3000/api/v1/leaves/$LEAVE_ID/approve -H "Authorization: Bearer $ADM"
      ```
      the SSE shell prints a `data:` frame within ~1s.
- [ ] `GET /notifications/me` lists the new notification; `PATCH /notifications/:id/read`
      flips `isRead` to true (and only the owner may read/mark it — else `403`).
- [ ] An `AuditLog` row exists for the approval (and for a salary edit via S08's
      `PUT /payroll/:employeeId`) with correct `action`/`entity`/`entityId`.
- [ ] Cross-instance delivery works: run two api instances on different ports sharing
      one Redis; connect the SSE client to instance A, trigger the approval against
      instance B, and confirm the frame still arrives on A.

## On completion (Step 6)
- `build/STATE.md`: set S09 → `DONE`; under "Interfaces produced (detail)" list
  `GET /events`, `GET /notifications/me`, `PATCH /notifications/:id/read`, the
  `notify(...)`, `pubsub.publish(...)`, and `writeAudit(...)` signatures, the email
  provider interface, and the Redis channel naming. Under "Blockers/notes" **announce
  the `Notification` schema/migration change** and list every S05–S08 file you edited
  to wire hooks.
- `build/logs/S09-log.md`: from `_TEMPLATE.md` — record the pub/sub design (separate
  pub/sub connections), heartbeat interval, which hooks were present vs adapted, and
  the new ADR number for the Notification model.

## ▶ Copy-paste prompt
```
You are running build session S09 (Realtime + Notifications + Audit) for the Dayflow
HRMS monorepo. This is a fresh chat with no prior memory — all context lives in
committed files.

1. Read in order: AGENTS.md, plan.md, build/SESSION_PROTOCOL.md, build/STATE.md, then
   build/sessions/S09-realtime-notifications-audit.md (your full spec). Also read
   docs/DECISIONS.md ADR-003/009/010 and the S05–S08 logs to find the hooks they left.
2. Verify the preconditions (S04–S08 DONE; their notification/audit hooks exist; Redis
   available). If anything blocks you, stop and tell me.
3. Follow the Session Protocol's seven steps: branch feat/s09-realtime, build ONLY the
   Deliverables in the session file (realtime + notification + audit modules, the
   Notification model + migration, and the minimal wiring into S05–S08 hooks), run
   every Acceptance criteria command and confirm it passes, then update build/STATE.md
   and write build/logs/S09-log.md, and commit using Conventional Commits (no AI
   co-author line).
4. Implement exactly: SSE at GET /api/v1/events (auth) backed by Redis pub/sub for
   horizontal scale; a notify() that writes a Notification + publishes SSE + optional
   email via a pluggable provider (console in dev); writeAudit() into AuditLog on
   salary edits / leave approvals / role changes; and /notifications/me +
   /notifications/:id/read.
5. You are ADDING a Notification model to the Prisma schema — a shared-contract change.
   Announce it loudly in STATE.md + your log, and add an ADR to docs/DECISIONS.md.
6. Finish with a handoff summary: what's done, what's unblocked (richer S12/S14 UX),
   and the next session to run.

Stay in scope — fill the hooks, don't redesign S05–S08. When the spec is ambiguous,
follow docs/DECISIONS.md. Begin.
```

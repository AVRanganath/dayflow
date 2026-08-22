/**
 * Audit trail (S09, differentiator #3). `writeAudit()` records sensitive
 * mutations — salary edits, leave approvals/rejections, admin employee edits —
 * into `AuditLog`.
 *
 * It never throws into the caller: an audit write failing must not fail (or roll
 * back) the mutation it describes. Callers may fire it without awaiting.
 */
import type { Prisma } from '@dayflow/db';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/** One audit entry. `oldValues`/`newValues` are stored as JSON snapshots. */
export interface AuditInput {
  /** `User.id` of the actor who performed the mutation. */
  userId: string;
  /** What happened, e.g. `LEAVE_APPROVED`, `SALARY_STRUCTURE_UPDATED`. */
  action: string;
  /** The affected model, e.g. `LeaveRequest`. */
  entity: string;
  /** Primary key of the affected row. */
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/** JSON-safe snapshot for a Prisma `Json?` column (Decimals, Dates → strings). */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Writes an audit row. Errors are logged and swallowed. */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValues: toJson(input.oldValues),
        newValues: toJson(input.newValues),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    logger.error({ err, action: input.action, entity: input.entity }, 'writeAudit() failed');
  }
}

/** Pulls the request's IP + user agent, for call sites that have the `Request`. */
export function requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

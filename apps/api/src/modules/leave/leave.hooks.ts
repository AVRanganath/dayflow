/**
 * S09 wiring for leave decisions. `leave.service.ts` calls this after a
 * successful approve/reject; here it fans out to the in-app notification + SSE
 * push (ADR-009/011) and the audit trail (differentiator #3).
 *
 * Fire-and-forget by design: the signature stays synchronous so the service's
 * critical path is untouched, and every failure inside is logged and swallowed.
 */
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { notify } from '../notification/notification.service.js';
import { writeAudit } from '../audit/audit.service.js';

export interface LeaveDecisionEvent {
  employeeId: string;
  leaveId: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
  /** `User.id` of the reviewing admin/HR — the audit actor. Added by S09. */
  reviewerUserId: string;
}

/**
 * Notifies the employee that their leave was approved/rejected and records the
 * decision in the audit log.
 */
export function notifyLeaveDecision(event: LeaveDecisionEvent): void {
  void handle(event).catch((err: unknown) =>
    logger.error({ err, leaveId: event.leaveId }, 'notifyLeaveDecision failed'),
  );
}

async function handle(event: LeaveDecisionEvent): Promise<void> {
  // Notifications hang off the User account; the leave module works in Employee ids.
  const employee = await prisma.employee.findUnique({
    where: { id: event.employeeId },
    select: { userId: true },
  });

  const approved = event.status === 'APPROVED';

  if (employee) {
    await notify({
      userId: employee.userId,
      type: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      title: approved ? 'Leave approved' : 'Leave rejected',
      body: approved
        ? 'Your leave request has been approved.'
        : `Your leave request was rejected: ${event.reason ?? 'no reason given'}`,
      payload: { leaveId: event.leaveId, status: event.status },
      email: true,
    });
  } else {
    logger.warn({ employeeId: event.employeeId }, 'Leave decision for an unknown employee');
  }

  await writeAudit({
    userId: event.reviewerUserId,
    action: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    entity: 'LeaveRequest',
    entityId: event.leaveId,
    newValues: { status: event.status, reason: event.reason },
  });
}

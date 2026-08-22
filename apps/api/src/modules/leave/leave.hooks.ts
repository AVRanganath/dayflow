/**
 * S09 notification hook. `leave.service.ts` calls this after a successful
 * approve/reject so the realtime + notifications session (S09) has a single,
 * clearly-marked place to wire in the real implementation. Deliberately a
 * no-op today — do NOT add Redis/SSE/DB code here, that's S09's scope.
 */

export interface LeaveDecisionEvent {
  employeeId: string;
  leaveId: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}

/**
 * Fires when a leave request is approved or rejected.
 * TODO(S09): emit an SSE event (ADR-009) + create an in-app `Notification`
 * (ADR-011) + write an `AuditLog` row for this decision.
 */
export function notifyLeaveDecision(_event: LeaveDecisionEvent): void {
  // no-op until S09 lands
}

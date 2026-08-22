/**
 * Internal types for the leave module that aren't already inferred from a
 * `@dayflow/shared` Zod schema (plan.md §6 — never redefine a shared type).
 */
import type { LeaveType } from '@dayflow/shared';

/** Leave types that carry a `LeaveBalance` row (ADR-004). `UNPAID`/`MATERNITY`/`PATERNITY` don't. */
export const BALANCE_TRACKED_LEAVE_TYPES = ['PAID', 'SICK', 'CASUAL'] as const;
export type BalanceTrackedLeaveType = (typeof BALANCE_TRACKED_LEAVE_TYPES)[number];

/** Narrows a `LeaveType` to the balance-tracked subset. */
export function isBalanceTracked(type: LeaveType): type is BalanceTrackedLeaveType {
  return (BALANCE_TRACKED_LEAVE_TYPES as readonly string[]).includes(type);
}

/** One row of `GET /leaves/balance/me` (ADR-004). */
export interface LeaveBalanceLine {
  allocated: number;
  used: number;
  remaining: number;
}

/** Full balance summary keyed by balance-tracked leave type. */
export type LeaveBalanceSummary = Record<BalanceTrackedLeaveType, LeaveBalanceLine>;

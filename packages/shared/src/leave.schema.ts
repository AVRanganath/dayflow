/**
 * @dayflow/shared — leave & time-off schemas (ADR-004, ADR-006, ADR-018).
 */
import { z } from 'zod';
import { LeaveStatusSchema, LeaveTypeSchema } from './constants.js';

/**
 * Apply for leave (ADR-004). `attachmentUrl` carries a sick-leave certificate
 * (ADR-018). The server counts working days (skipping weekends) and validates balance.
 */
export const ApplyLeaveSchema = z
  .object({
    type: LeaveTypeSchema,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
    attachmentUrl: z.string().url().optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });
export type ApplyLeaveInput = z.infer<typeof ApplyLeaveSchema>;

/** Reject a pending leave (ADR-006) — a reason is required. */
export const RejectLeaveSchema = z.object({
  reason: z.string().min(5, 'A rejection reason is required'),
});
export type RejectLeaveInput = z.infer<typeof RejectLeaveSchema>;

/** Optional approve note. */
export const ApproveLeaveSchema = z.object({
  notes: z.string().optional(),
});
export type ApproveLeaveInput = z.infer<typeof ApproveLeaveSchema>;

/** Admin/HR leave allocation (ADR-018) — sets/updates a `LeaveBalance` row. */
export const AllocateLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  type: LeaveTypeSchema,
  totalAllowed: z.number().int().nonnegative(),
  year: z.number().int().min(2000).max(3000).optional(),
});
export type AllocateLeaveInput = z.infer<typeof AllocateLeaveSchema>;

/** Query for the admin leave list. */
export const LeaveListQuerySchema = z.object({
  status: LeaveStatusSchema.optional(),
});
export type LeaveListQuery = z.infer<typeof LeaveListQuerySchema>;

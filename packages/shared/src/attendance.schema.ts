/**
 * @dayflow/shared — attendance schemas (ADR-005, ADR-019).
 */
import { z } from 'zod';
import { AttendanceStatusSchema } from './constants.js';

/** Check-in body. `ipAddress` is usually inferred server-side from the request. */
export const CheckInSchema = z.object({
  location: z.string().optional(),
  ipAddress: z.string().ip().optional(),
});
export type CheckInInput = z.infer<typeof CheckInSchema>;

/** Check-out body. `breakMinutes` (ADR-019) is subtracted when computing worked hours. */
export const CheckOutSchema = z.object({
  breakMinutes: z.number().int().nonnegative().optional(),
});
export type CheckOutInput = z.infer<typeof CheckOutSchema>;

/** Range selector for an employee's own attendance view (default day-wise, month). */
export const AttendanceRangeSchema = z.enum(['daily', 'weekly', 'monthly']);
export type AttendanceRange = z.infer<typeof AttendanceRangeSchema>;

/** Query for the admin all-employees attendance view. */
export const AttendanceListQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date as YYYY-MM-DD')
    .optional(),
  departmentId: z.string().uuid().optional(),
  status: AttendanceStatusSchema.optional(),
});
export type AttendanceListQuery = z.infer<typeof AttendanceListQuerySchema>;

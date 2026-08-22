/**
 * Attendance router (S06), mounted at `/api/v1/attendance` by `routes/index.ts`.
 *
 * Employee routes sit behind `requireAuth`; admin routes behind
 * `requireRole('ADMIN','HR')` (ADR-001 — HR is management too). Every write/query
 * boundary is `validate(...)`d against a `@dayflow/shared` schema. Handlers are wrapped
 * so async rejections reach the global error handler (Express 4 doesn't await them).
 */
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import {
  AttendanceListQuerySchema,
  AttendanceRangeSchema,
  CheckInSchema,
  CheckOutSchema,
  PaginationQuerySchema,
} from '@dayflow/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from './attendance.http.js';
import * as controller from './attendance.controller.js';

/** Wraps an async handler so a rejected promise is forwarded to `next` (→ errorHandler). */
function asyncHandler(fn: (...args: Parameters<RequestHandler>) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** `/attendance/me` query: the `range` selector plus cursor pagination. */
const MeQuerySchema = z
  .object({ range: AttendanceRangeSchema.default('monthly') })
  .merge(PaginationQuerySchema);

/** `/attendance` (admin) query: filters plus cursor pagination. */
const ListQuerySchema = AttendanceListQuerySchema.merge(PaginationQuerySchema);

/** `/attendance/summary` (admin) query: an optional target `date`. */
const SummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date as YYYY-MM-DD')
    .optional(),
});

export const attendanceRouter: Router = Router();

// --- Employee routes -------------------------------------------------------
attendanceRouter.post(
  '/check-in',
  requireAuth,
  validate(CheckInSchema, 'body'),
  asyncHandler(controller.checkIn),
);

attendanceRouter.post(
  '/check-out',
  requireAuth,
  validate(CheckOutSchema, 'body'),
  asyncHandler(controller.checkOut),
);

attendanceRouter.get(
  '/me',
  requireAuth,
  validate(MeQuerySchema, 'query'),
  asyncHandler(controller.getMine),
);

// --- Admin / HR routes -----------------------------------------------------
attendanceRouter.get(
  '/summary',
  requireAuth,
  requireRole('ADMIN', 'HR'),
  validate(SummaryQuerySchema, 'query'),
  asyncHandler(controller.getSummary),
);

attendanceRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'HR'),
  validate(ListQuerySchema, 'query'),
  asyncHandler(controller.listAll),
);

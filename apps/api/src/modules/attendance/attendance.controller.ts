/**
 * Attendance controllers (S06) — thin request handlers: parse the (already-validated)
 * request, delegate to the service, and send the ADR-010 envelope. No Prisma here.
 */
import type { Request, Response } from 'express';
import type {
  AttendanceListQuery,
  AttendanceRange,
  CheckInInput,
  CheckOutInput,
} from '@dayflow/shared';
import { UnauthorizedError } from '../../lib/errors.js';
import { sendSuccess } from './attendance.http.js';
import { toDateOnly } from './work-status.js';
import * as service from './attendance.service.js';

/** Reads the authenticated `User.id` set by `requireAuth`, or 401 if absent. */
function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user.id;
}

/** POST /attendance/check-in (EMPLOYEE). 201 with the new row + workStatus. */
export async function checkIn(req: Request, res: Response): Promise<void> {
  const employeeId = await service.resolveEmployeeId(userId(req));
  const body = req.body as CheckInInput;
  const result = await service.checkIn(employeeId, body);
  sendSuccess(res, 201, result);
}

/** POST /attendance/check-out (EMPLOYEE). 200 with computed hours (ADR-019). */
export async function checkOut(req: Request, res: Response): Promise<void> {
  const employeeId = await service.resolveEmployeeId(userId(req));
  const body = req.body as CheckOutInput;
  const result = await service.checkOut(employeeId, body);
  sendSuccess(res, 200, result);
}

/** GET /attendance/me (EMPLOYEE). Range-windowed, cursor-paginated own attendance. */
export async function getMine(req: Request, res: Response): Promise<void> {
  const employeeId = await service.resolveEmployeeId(userId(req));
  const query = req.query as { range?: AttendanceRange; cursor?: string; limit?: number };
  const range: AttendanceRange = query.range ?? 'monthly';
  const { rows, meta } = await service.getMine(employeeId, range, query.cursor, query.limit);
  sendSuccess(res, 200, rows, meta);
}

/** GET /attendance (ADMIN/HR). Filtered, cursor-paginated all-employees list. */
export async function listAll(req: Request, res: Response): Promise<void> {
  const query = req.query as AttendanceListQuery & { cursor?: string; limit?: number };
  const { rows, meta } = await service.listAll(query, query.cursor, query.limit);
  sendSuccess(res, 200, rows, meta);
}

/** GET /attendance/summary (ADMIN/HR). Dashboard counts for a date (default today). */
export async function getSummary(req: Request, res: Response): Promise<void> {
  const dateParam = (req.query as { date?: string }).date;
  const date = dateParam ? toDateOnly(new Date(`${dateParam}T00:00:00.000Z`)) : undefined;
  const summary = await service.getSummary(date);
  sendSuccess(res, 200, summary);
}

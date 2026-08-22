/**
 * Attendance service (S06) — all Prisma access for the attendance module lives here
 * (route → controller → service → prisma). Controllers stay thin.
 *
 * Covers ADR-005 (status enum), ADR-017 (computed workStatus), ADR-019 (breaks,
 * hoursWorked, extraHours, day-wise current-month default) and ADR-010 (cursor meta).
 */
import { Prisma } from '@prisma/client';
import type { Attendance, AttendanceStatus } from '@prisma/client';
import type {
  AttendanceListQuery,
  AttendanceRange,
  CheckInInput,
  CheckOutInput,
  ResponseMeta,
} from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { computeWorkStatus, today, toDateOnly, type WorkStatus } from './work-status.js';

/**
 * Standard workday length in hours used for `extraHours` (ADR-019). The seed models a
 * 09:00→17:00 (8h) day; company-configurable per ADR-016 is future work. Documented in
 * `build/logs/S06-log.md`.
 */
const STANDARD_WORKDAY_HOURS = 8;

/** Default page size for cursor lists (mirrors `@dayflow/shared` DEFAULT_LIMIT). */
const DEFAULT_LIMIT = 20;

/** Milliseconds in one hour, for worked-time math. */
const MS_PER_HOUR = 1000 * 60 * 60;

/** Row shape returned to the employee's own attendance view (ADR-019 columns). */
export interface MyAttendanceRow {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakMinutes: number;
  hoursWorked: number | null;
  extraHours: number | null;
  status: AttendanceStatus;
}

/** Row shape returned to the admin all-employees list. */
export interface AdminAttendanceRow extends MyAttendanceRow {
  employeeId: string;
  employee: { name: string; departmentId: string | null };
}

/** Dashboard summary counts for a single date (ADR-017 / summary rule). */
export interface AttendanceSummary {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
}

/** Result of a check-in. */
export interface CheckInResult {
  id: string;
  checkInTime: string;
  status: AttendanceStatus;
  workStatus: WorkStatus;
}

/** Result of a check-out (with computed hours, ADR-019). */
export interface CheckOutResult {
  id: string;
  checkOutTime: string;
  breakMinutes: number;
  hoursWorked: number;
  extraHours: number;
}

/** Rounds a number to 2 decimals (Decimal(5,2) storage). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolves the `Employee.id` for an authenticated `User.id`. `req.user` (from S04's
 * `requireAuth`) exposes the User id + role, not the employee id, so employee-scoped
 * routes must map through here.
 *
 * @throws {NotFoundError} when the user has no linked employee profile.
 */
export async function resolveEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!employee) throw new NotFoundError('No employee profile is linked to this account');
  return employee.id;
}

/**
 * Records the employee's check-in for today (status `PRESENT`). Relies on the
 * `@@unique([employeeId, date])` invariant: a second check-in the same day trips the
 * Prisma `P2002` unique violation, translated to a `409 ALREADY_CHECKED_IN`.
 */
export async function checkIn(employeeId: string, input: CheckInInput): Promise<CheckInResult> {
  const now = new Date();
  const date = today();

  try {
    const row = await prisma.attendance.create({
      data: {
        employeeId,
        date,
        checkIn: now,
        status: 'PRESENT',
        breakMinutes: 0,
        notes: input.location ? `location: ${input.location}` : undefined,
      },
      select: { id: true, checkIn: true, status: true },
    });

    return {
      id: row.id,
      checkInTime: (row.checkIn ?? now).toISOString(),
      status: row.status,
      workStatus: 'PRESENT',
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('You have already checked in today', { code: 'ALREADY_CHECKED_IN' });
    }
    throw err;
  }
}

/**
 * Records check-out for today and computes worked/extra hours (ADR-019):
 *   `hoursWorked = ((checkOut − checkIn) − breakMinutes)` in hours, rounded to 2dp;
 *   `extraHours  = max(0, hoursWorked − STANDARD_WORKDAY_HOURS)`.
 *
 * @throws {NotFoundError} when there is no check-in row for today.
 * @throws {ConflictError} when already checked out.
 */
export async function checkOut(employeeId: string, input: CheckOutInput): Promise<CheckOutResult> {
  const date = today();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
    select: { id: true, checkIn: true, checkOut: true },
  });

  if (!existing || !existing.checkIn) {
    throw new NotFoundError('No check-in found for today; check in before checking out');
  }
  if (existing.checkOut) {
    throw new ConflictError('You have already checked out today', { code: 'ALREADY_CHECKED_OUT' });
  }

  const now = new Date();
  const breakMinutes = input.breakMinutes ?? 0;
  const grossHours = (now.getTime() - existing.checkIn.getTime()) / MS_PER_HOUR;
  const hoursWorked = Math.max(0, round2(grossHours - breakMinutes / 60));
  const extraHours = round2(Math.max(0, hoursWorked - STANDARD_WORKDAY_HOURS));

  const row = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      breakMinutes,
      hoursWorked: new Prisma.Decimal(hoursWorked),
      extraHours: new Prisma.Decimal(extraHours),
    },
    select: { id: true, checkOut: true, breakMinutes: true },
  });

  return {
    id: row.id,
    checkOutTime: (row.checkOut ?? now).toISOString(),
    breakMinutes: row.breakMinutes,
    hoursWorked,
    extraHours,
  };
}

/**
 * Maps a `range` to an inclusive `[start, end]` date-only window ending today:
 *   - `daily`   → today only.
 *   - `weekly`  → the last 7 days (today − 6 … today).
 *   - `monthly` → the 1st of the current month … today (the default, day-wise view).
 */
export function rangeWindow(
  range: AttendanceRange,
  now: Date = today(),
): { start: Date; end: Date } {
  const end = toDateOnly(now);
  if (range === 'daily') return { start: end, end };
  if (range === 'weekly') {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start, end };
  }
  // monthly (default): first of the current month → today.
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { start, end };
}

/** Serializes a Prisma `Attendance` row to the public `MyAttendanceRow` shape. */
function toMyRow(a: Attendance): MyAttendanceRow {
  return {
    id: a.id,
    date: toDateOnly(a.date).toISOString().slice(0, 10),
    checkInTime: a.checkIn ? a.checkIn.toISOString() : null,
    checkOutTime: a.checkOut ? a.checkOut.toISOString() : null,
    breakMinutes: a.breakMinutes,
    hoursWorked: a.hoursWorked ? Number(a.hoursWorked) : null,
    extraHours: a.extraHours ? Number(a.extraHours) : null,
    status: a.status,
  };
}

/**
 * The caller's own attendance for a `range` window, newest-first, cursor-paginated.
 * Default (`monthly`) is the current month day-wise (ADR-019). The cursor is the last
 * row id; `meta.nextCursor` is set when a further page exists.
 */
export async function getMine(
  employeeId: string,
  range: AttendanceRange,
  cursor: string | undefined,
  limit: number = DEFAULT_LIMIT,
): Promise<{ rows: MyAttendanceRow[]; meta: ResponseMeta }> {
  const { start, end } = rangeWindow(range);

  const rows = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return { rows: page.map(toMyRow), meta: { nextCursor, limit } };
}

/**
 * Admin/HR view of all employees' attendance with optional `date` / `departmentId` /
 * `status` filters, cursor-paginated. Each row carries minimal employee info.
 */
export async function listAll(
  query: AttendanceListQuery,
  cursor: string | undefined,
  limit: number = DEFAULT_LIMIT,
): Promise<{ rows: AdminAttendanceRow[]; meta: ResponseMeta }> {
  const where: Prisma.AttendanceWhereInput = {};
  if (query.date) {
    const day = toDateOnly(new Date(`${query.date}T00:00:00.000Z`));
    where.date = day;
  }
  if (query.status) where.status = query.status;
  if (query.departmentId) where.employee = { departmentId: query.departmentId };

  const rows = await prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      employee: { select: { firstName: true, lastName: true, departmentId: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  const mapped: AdminAttendanceRow[] = page.map((a) => ({
    ...toMyRow(a),
    employeeId: a.employeeId,
    employee: {
      name: `${a.employee.firstName} ${a.employee.lastName}`,
      departmentId: a.employee.departmentId,
    },
  }));

  return { rows: mapped, meta: { nextCursor, limit } };
}

/**
 * Dashboard summary counts for `date` (default today). Counting rule (documented in the
 * S06 log so S12's dashboard matches):
 *   - `totalEmployees` = count of active employees (`User.isActive = true`).
 *   - `present`        = attendance rows that day with status `PRESENT` or `HALF_DAY`.
 *   - `onLeave`        = attendance rows that day with status `ON_LEAVE`.
 *   - `absent`         = `totalEmployees − present − onLeave` (everyone not present and
 *                        not on leave — covers explicit `ABSENT` rows and no-row days).
 */
export async function getSummary(date: Date = today()): Promise<AttendanceSummary> {
  const day = toDateOnly(date);

  const [totalEmployees, present, onLeave] = await Promise.all([
    prisma.employee.count({ where: { user: { isActive: true } } }),
    prisma.attendance.count({
      where: { date: day, status: { in: ['PRESENT', 'HALF_DAY'] } },
    }),
    prisma.attendance.count({ where: { date: day, status: 'ON_LEAVE' } }),
  ]);

  const absent = Math.max(0, totalEmployees - present - onLeave);
  return { totalEmployees, present, absent, onLeave };
}

// Re-export the shared workStatus helper (ADR-017) so consumers can import everything
// attendance-related from the service if they prefer.
export { computeWorkStatus };

/**
 * Computed work-status helper (ADR-017).
 *
 * `workStatus` is a **derived, not-stored** indicator rendered as 🟢/🟡/✈️ on the
 * dashboard (S12) and directory (S13) cards. It is computed server-side from
 * today's `Attendance` row plus any approved `LeaveRequest` that covers the day:
 *
 *   - `PRESENT`   — the employee has checked in today (an `Attendance` row exists
 *                   for the date with a non-null `checkIn`, or status PRESENT/HALF_DAY).
 *   - `ON_LEAVE`  — an APPROVED `LeaveRequest` spans the date (or the attendance
 *                   row is explicitly `ON_LEAVE`).
 *   - `ABSENT`    — neither of the above.
 *
 * **Import path for S05 / S12 / S13:**
 *   `import { computeWorkStatus } from '../attendance/work-status.js'`
 * (adjust the relative prefix from the caller's module folder).
 */
import { prisma } from '../../lib/prisma.js';

/** The three states surfaced on employee cards (ADR-017). Subset of `AttendanceStatus`. */
export type WorkStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE';

/**
 * Normalizes a `Date` to UTC midnight — matching how `@db.Date` values are stored,
 * so equality/range comparisons on the `date` column line up.
 */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Today's date at UTC midnight (server clock). Reused as the check-in/out `date` key. */
export function today(): Date {
  return toDateOnly(new Date());
}

/**
 * Computes an employee's {@link WorkStatus} for a given date (default: today).
 *
 * A single call issues two indexed lookups. When resolving `workStatus` for many
 * employees (e.g. the directory list), prefer batching at the call site rather than
 * calling this per row; this helper is the single-employee source of truth.
 *
 * @param employeeId - `Employee.id` (not `User.id`).
 * @param date - the day to evaluate; normalized to date-only. Defaults to today.
 */
export async function computeWorkStatus(
  employeeId: string,
  date: Date = today(),
): Promise<WorkStatus> {
  const day = toDateOnly(date);

  const [attendance, approvedLeave] = await Promise.all([
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
      select: { status: true, checkIn: true },
    }),
    prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: day },
        endDate: { gte: day },
      },
      select: { id: true },
    }),
  ]);

  if (attendance) {
    if (attendance.status === 'ON_LEAVE') return 'ON_LEAVE';
    if (attendance.status === 'PRESENT' || attendance.status === 'HALF_DAY' || attendance.checkIn) {
      return 'PRESENT';
    }
    // status === 'ABSENT' with no check-in → fall through to leave check below.
  }

  if (approvedLeave) return 'ON_LEAVE';

  return 'ABSENT';
}

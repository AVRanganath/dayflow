/**
 * Work-status derivation (ADR-017). `workStatus` is computed server-side from
 * today's `Attendance` + approved `LeaveRequest` and is never stored:
 *   - `PRESENT`   — checked in today (has an attendance row with a `checkIn`).
 *   - `ON_LEAVE`  — on an approved leave whose date range covers today.
 *   - `ABSENT`    — otherwise.
 *
 * A minimal local implementation lives here because S06 (attendance) may not be
 * merged when this module runs; if S06 later exposes a canonical helper, prefer
 * importing it. Exposed on employee list/card responses (S12/S13 consume it).
 */
import type { WorkStatus } from '@dayflow/shared';
import { prisma } from './prisma.js';

/** Start (inclusive) and end (exclusive) of today in server-local time. */
export function todayRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Compute the `workStatus` for many employees in two batched queries (avoids an
 * N+1 over a directory page).
 *
 * @param employeeIds - Employee ids to resolve status for.
 * @returns Map of `employeeId → WorkStatus`. Ids with no data map to `ABSENT`.
 */
export async function computeWorkStatuses(
  employeeIds: readonly string[],
): Promise<Map<string, WorkStatus>> {
  const result = new Map<string, WorkStatus>();
  if (employeeIds.length === 0) return result;

  const ids = [...employeeIds];
  const { start, end } = todayRange();

  const [presentRows, leaveRows] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId: { in: ids },
        date: { gte: start, lt: end },
        checkIn: { not: null },
      },
      select: { employeeId: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: ids },
        status: 'APPROVED',
        startDate: { lte: start },
        endDate: { gte: start },
      },
      select: { employeeId: true },
    }),
  ]);

  const present = new Set(presentRows.map((r) => r.employeeId));
  const onLeave = new Set(leaveRows.map((r) => r.employeeId));

  for (const id of ids) {
    if (present.has(id)) result.set(id, 'PRESENT');
    else if (onLeave.has(id)) result.set(id, 'ON_LEAVE');
    else result.set(id, 'ABSENT');
  }
  return result;
}

/** Convenience single-employee variant of {@link computeWorkStatuses}. */
export async function computeWorkStatus(employeeId: string): Promise<WorkStatus> {
  const map = await computeWorkStatuses([employeeId]);
  return map.get(employeeId) ?? 'ABSENT';
}

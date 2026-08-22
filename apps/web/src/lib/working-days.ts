/**
 * Working-day counting for the leave apply modal (differentiator #4, S14).
 *
 * Mirrors the server's `countWorkingDays` (S07): inclusive of both endpoints, counted
 * in UTC date-only, skipping Saturdays and Sundays. The server's count is authoritative
 * on the response — this is a live client preview so the user sees the total before
 * submitting.
 */

/**
 * Counts working days (Mon–Fri) between two dates, inclusive, skipping weekends.
 * Returns 0 for an invalid range or when `end` is before `start`.
 * @param start Start date (ISO string or Date).
 * @param end End date (ISO string or Date).
 */
export function countWorkingDays(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;

  // Normalise to UTC midnight to count whole days regardless of local time.
  let cursor = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const last = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  if (last < cursor) return 0;

  let count = 0;
  const DAY_MS = 24 * 60 * 60 * 1000;
  while (cursor <= last) {
    const day = new Date(cursor).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor += DAY_MS;
  }
  return count;
}

/**
 * Shared attendance status ↔ colour/label mapping (ADR-005), used by the calendar,
 * weekly table, and legend so the colours stay consistent. Per the S14 spec:
 * PRESENT green, ABSENT red, HALF_DAY yellow, ON_LEAVE blue.
 */
import type { AttendanceStatus } from '@dayflow/shared';

/** Hex colour for each stored attendance status (ADR-005). */
export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: '#10B981',
  ABSENT: '#EF4444',
  HALF_DAY: '#F59E0B',
  ON_LEAVE: '#017E84',
};

/** Human label for each stored attendance status. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half-day',
  ON_LEAVE: 'Leave',
};

/** Ordered list for legends. */
export const ATTENDANCE_STATUSES_ORDERED: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
];

/**
 * Formats an ISO timestamp as a short local time (e.g. "09:05 AM"), or "—" when absent.
 * @param iso ISO timestamp string or null.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Typed attendance fetchers over the Dayflow API (S06 endpoints).
 *
 * Wraps the S10 `api` client with strongly-typed request/response shapes for the
 * attendance pages (S14). Responses follow the ADR-010 envelope; list fetchers use
 * {@link getWithMeta} so the cursor survives. No `any`.
 */
import { API_ROUTES, type AttendanceRange, type AttendanceStatus } from '@dayflow/shared';
import { api } from './client';
import { getWithMeta, type EnvelopePage } from './raw';

/**
 * A single attendance row for the current employee (`GET /attendance/me`).
 * Times are ISO strings (or `null` when not recorded); hour figures are numbers.
 */
export interface MyAttendanceRow {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakMinutes: number | null;
  hoursWorked: number | null;
  extraHours: number | null;
  status: AttendanceStatus;
}

/** A row in the admin all-employees attendance view (`GET /attendance`). */
export interface AdminAttendanceRow {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakMinutes: number | null;
  hoursWorked: number | null;
  extraHours: number | null;
  status: AttendanceStatus;
  employee: { name: string; departmentId: string | null };
}

/** Result of a check-in (`POST /attendance/check-in`). */
export interface CheckInResult {
  id: string;
  checkInTime: string;
  status: AttendanceStatus;
  workStatus: string;
}

/** Result of a check-out (`POST /attendance/check-out`). */
export interface CheckOutResult {
  id: string;
  checkOutTime: string;
  breakMinutes: number;
  hoursWorked: number;
  extraHours: number;
}

/**
 * Records the current employee's check-in for today.
 * @param location Optional free-text location; `ipAddress` is inferred server-side.
 */
export function checkIn(location?: string): Promise<CheckInResult> {
  return api.post<CheckInResult>(API_ROUTES.attendance.checkIn, location ? { location } : {});
}

/**
 * Records the current employee's check-out for today.
 * @param breakMinutes Optional break minutes, subtracted from worked hours (ADR-019).
 */
export function checkOut(breakMinutes?: number): Promise<CheckOutResult> {
  return api.post<CheckOutResult>(
    API_ROUTES.attendance.checkOut,
    breakMinutes !== undefined ? { breakMinutes } : {},
  );
}

/**
 * Fetches the current employee's attendance for a range (default `monthly`, day-wise
 * for the current month per ADR-019).
 */
export function getMyAttendance(
  range: AttendanceRange = 'monthly',
  cursor?: string,
): Promise<EnvelopePage<MyAttendanceRow[]>> {
  return getWithMeta<MyAttendanceRow[]>(API_ROUTES.attendance.me, { range, cursor });
}

/** Query filters for the admin all-employees attendance list. */
export interface AdminAttendanceFilters {
  date?: string;
  departmentId?: string;
  status?: AttendanceStatus;
  cursor?: string;
}

/** Fetches the admin all-employees attendance list (ADMIN/HR). */
export function getAllAttendance(
  filters: AdminAttendanceFilters = {},
): Promise<EnvelopePage<AdminAttendanceRow[]>> {
  return getWithMeta<AdminAttendanceRow[]>(API_ROUTES.attendance.base, {
    date: filters.date,
    departmentId: filters.departmentId,
    status: filters.status,
    cursor: filters.cursor,
  });
}

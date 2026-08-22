/**
 * @dayflow/shared — enums, route paths, and app-wide constants.
 *
 * Enum string values mirror the Prisma enums exactly (same casing) so the API and DB
 * line up. Where an ADR changes an enum, the ADR wins and S01 realigns the Prisma
 * schema (e.g. `Role.HR` — ADR-001/012, added to the DB in S01).
 */
import { z } from 'zod';

/** User roles. `ADMIN`+`HR` are management; employee self-signup is disabled (ADR-012). */
export const ROLES = ['ADMIN', 'HR', 'EMPLOYEE'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/** Leave types (ADR-004). Balances tracked for PAID/SICK/CASUAL; UNPAID is unlimited. */
export const LEAVE_TYPES = ['PAID', 'SICK', 'UNPAID', 'CASUAL', 'MATERNITY', 'PATERNITY'] as const;
export const LeaveTypeSchema = z.enum(LEAVE_TYPES);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

/** Stored daily attendance status (ADR-005). */
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'] as const;
export const AttendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

/** Leave request lifecycle. */
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const LeaveStatusSchema = z.enum(LEAVE_STATUSES);
export type LeaveStatus = z.infer<typeof LeaveStatusSchema>;

/** Payroll record lifecycle. */
export const PAYROLL_STATUSES = ['DRAFT', 'PROCESSED', 'PAID'] as const;
export const PayrollStatusSchema = z.enum(PAYROLL_STATUSES);
export type PayrollStatus = z.infer<typeof PayrollStatusSchema>;

/** Employee gender. */
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const GenderSchema = z.enum(GENDERS);
export type Gender = z.infer<typeof GenderSchema>;

/** Marital status (ADR-015). */
export const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'OTHER'] as const;
export const MaritalStatusSchema = z.enum(MARITAL_STATUSES);
export type MaritalStatus = z.infer<typeof MaritalStatusSchema>;

/** Employment type. */
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const;
export const EmploymentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

/** Computed live work-status indicator (ADR-017) — derived, never stored. */
export const WORK_STATUSES = ['PRESENT', 'ABSENT', 'ON_LEAVE'] as const;
export const WorkStatusSchema = z.enum(WORK_STATUSES);
export type WorkStatus = z.infer<typeof WorkStatusSchema>;

/** ISO-4217 currency for all monetary amounts (ADR-008). */
export const CURRENCY = 'INR' as const;

/** Pagination defaults for cursor-based list endpoints (ADR-010). */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** API version prefix. Every route is mounted under this base. */
export const API_BASE = '/api/v1';

/**
 * Canonical API route paths (relative to {@link API_BASE}). Param routes are builder
 * functions. Mirrors `docs/API.md` as amended by the design-board ADRs.
 */
export const API_ROUTES = {
  auth: {
    signup: '/auth/signup',
    signin: '/auth/signin',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    changePassword: '/auth/change-password',
    verifyEmail: (token: string) => `/auth/verify-email/${token}`,
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  employees: {
    base: '/employees',
    me: '/employees/me',
    create: '/employees',
    byId: (id: string) => `/employees/${id}`,
    profilePicture: (id: string) => `/employees/${id}/profile-picture`,
  },
  departments: {
    base: '/departments',
  },
  company: {
    base: '/company',
  },
  attendance: {
    checkIn: '/attendance/check-in',
    checkOut: '/attendance/check-out',
    me: '/attendance/me',
    base: '/attendance',
    summary: '/attendance/summary',
  },
  leaves: {
    base: '/leaves',
    me: '/leaves/me',
    balanceMe: '/leaves/balance/me',
    allocations: '/leaves/allocations',
    approve: (id: string) => `/leaves/${id}/approve`,
    reject: (id: string) => `/leaves/${id}/reject`,
  },
  payroll: {
    me: '/payroll/me',
    base: '/payroll',
    byEmployee: (employeeId: string) => `/payroll/${employeeId}`,
    salaryStructure: (employeeId: string) => `/payroll/${employeeId}/salary-structure`,
    payslip: (id: string) => `/payroll/${id}/payslip`,
  },
  notifications: {
    me: '/notifications/me',
    read: (id: string) => `/notifications/${id}/read`,
  },
  events: '/events',
} as const;

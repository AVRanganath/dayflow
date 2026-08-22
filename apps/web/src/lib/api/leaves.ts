/**
 * Typed leave fetchers over the Dayflow API (S07 endpoints).
 *
 * Covers apply (multipart file upload OR JSON `attachmentUrl`, ADR-018), my history,
 * the admin list, approve/reject (ADR-006), balances (ADR-004), and admin allocations
 * (ADR-018). List fetchers use {@link getWithMeta} so the cursor survives. No `any`.
 */
import {
  API_ROUTES,
  type AllocateLeaveInput,
  type LeaveStatus,
  type LeaveType,
} from '@dayflow/shared';
import { authStore } from '../auth/auth-store';
import { api } from './client';
import { getWithMeta, type EnvelopePage } from './raw';
import { ApiError, type ApiResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * One row of the current employee's leave history (`GET /leaves/me`).
 * Mirrors the API exactly: the type field is `leaveType`, `totalDays` is a Decimal
 * serialized as a string, and the single reviewer field is `reviewerComment`.
 */
export interface MyLeaveRow {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: string;
  reason: string;
  status: LeaveStatus;
  attachmentUrl: string | null;
  reviewerComment: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of the admin leave list (`GET /leaves`), enriched with the employee name. */
export interface AdminLeaveRow extends MyLeaveRow {
  employee: {
    firstName: string;
    lastName: string;
  };
}

/** A single tracked leave-balance line (allocated / used / remaining). */
export interface BalanceLine {
  allocated: number;
  used: number;
  remaining: number;
}

/** Tracked leave balances for the current year (`GET /leaves/balance/me`). */
export type LeaveBalanceSummary = Partial<Record<LeaveType, BalanceLine>>;

/** Fields for applying for leave. `attachmentUrl` and `file` are mutually optional. */
export interface ApplyLeaveFields {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  file?: File | null;
}

/**
 * Applies for leave (`POST /leaves`). When a `file` is supplied the request is sent as
 * `multipart/form-data` (ADR-018 sick-leave certificate); otherwise JSON is sent with an
 * optional `attachmentUrl`. Returns the created (PENDING) request.
 */
export async function applyLeave(fields: ApplyLeaveFields): Promise<MyLeaveRow> {
  if (fields.file) {
    const form = new FormData();
    form.append('type', fields.type);
    form.append('startDate', fields.startDate);
    form.append('endDate', fields.endDate);
    form.append('reason', fields.reason);
    form.append('file', fields.file);
    return postMultipart<MyLeaveRow>(API_ROUTES.leaves.base, form);
  }
  const body: Record<string, string> = {
    type: fields.type,
    startDate: fields.startDate,
    endDate: fields.endDate,
    reason: fields.reason,
  };
  if (fields.attachmentUrl) {
    body.attachmentUrl = fields.attachmentUrl;
  }
  return api.post<MyLeaveRow>(API_ROUTES.leaves.base, body);
}

/** Fetches the current employee's leave history (cursor-paginated). */
export function getMyLeaves(cursor?: string): Promise<EnvelopePage<MyLeaveRow[]>> {
  return getWithMeta<MyLeaveRow[]>(API_ROUTES.leaves.me, { cursor });
}

/** Fetches all leave requests (ADMIN/HR), optionally filtered by status. */
export function getAllLeaves(
  status?: LeaveStatus,
  cursor?: string,
): Promise<EnvelopePage<AdminLeaveRow[]>> {
  return getWithMeta<AdminLeaveRow[]>(API_ROUTES.leaves.base, { status, cursor });
}

/** Approves a pending leave request (ADMIN/HR); `notes` are optional (ADR-006). */
export function approveLeave(id: string, notes?: string): Promise<MyLeaveRow> {
  return api.patch<MyLeaveRow>(API_ROUTES.leaves.approve(id), notes ? { notes } : {});
}

/** Rejects a pending leave request (ADMIN/HR); a `reason` is required (ADR-006). */
export function rejectLeave(id: string, reason: string): Promise<MyLeaveRow> {
  return api.patch<MyLeaveRow>(API_ROUTES.leaves.reject(id), { reason });
}

/** Fetches the current employee's tracked balances for this year (ADR-004). */
export function getMyBalance(): Promise<LeaveBalanceSummary> {
  return api.get<LeaveBalanceSummary>(API_ROUTES.leaves.balanceMe);
}

/** Allocates a leave balance to an employee (ADMIN/HR, ADR-018). */
export function allocateLeave(input: AllocateLeaveInput): Promise<unknown> {
  return api.post(API_ROUTES.leaves.allocations, input);
}

/** A lightweight employee option for the allocation picker + admin filters. */
export interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
}

/** A department option for admin filters. */
export interface DepartmentOption {
  id: string;
  name: string;
}

/**
 * Fetches employees for the allocation modal's picker (ADMIN/HR). Reads the first page;
 * the seed company fits comfortably in one page for the MVP.
 */
export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  const page = await getWithMeta<EmployeeOption[]>(API_ROUTES.employees.base, { limit: 100 });
  return page.data;
}

/** Fetches departments (any authenticated role) for admin filters. */
export function getDepartments(): Promise<DepartmentOption[]> {
  return api.get<DepartmentOption[]>(API_ROUTES.departments.base);
}

/**
 * Performs an authenticated multipart POST (for file uploads). Mirrors the client's
 * auth handling but leaves the body as `FormData` so the browser sets the boundary.
 */
async function postMultipart<T>(path: string, form: FormData, isRetry = false): Promise<T> {
  const headers = new Headers();
  const token = authStore.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });

  if (response.status === 401 && !isRetry) {
    const newToken = await api.refresh();
    if (newToken) {
      return postMultipart<T>(path, form, true);
    }
  }

  const json = (await response.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'An unexpected error occurred',
      json.error?.details,
      response.status,
    );
  }
  return json.data;
}

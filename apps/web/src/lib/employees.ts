/**
 * Typed API helpers for the employee/profile pages (S13).
 *
 * Wraps the S10 `api` client around the S05 employee endpoints (`/employees`,
 * `/employees/me`, `/employees/:id`, `PUT /employees/me`,
 * `PATCH /employees/:id/profile-picture`) and `/departments`. Response shapes
 * mirror the server `employeeSelect` (see `apps/api/src/modules/employee/
 * employee.service.ts`) — the shared package only infers *input* types, so the
 * read shapes are declared here. No `any`.
 */
import type {
  ApiResponse,
  EmploymentType,
  Gender,
  MaritalStatus,
  Role,
  UpdateProfileInput,
  WorkStatus,
} from '@dayflow/shared';
import { API_BASE, API_ROUTES, DEFAULT_LIMIT } from '@dayflow/shared';
import { api } from './api/client';
import { authStore } from './auth/auth-store';
import { ApiError } from './api/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:8000${API_BASE}`;

/** Nested `user` subset returned on every employee record (no `passwordHash`). */
export interface EmployeeUser {
  loginId: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
}

/**
 * Full employee record as returned by `/employees/me`, `/employees/:id`, and
 * (as rows) `/employees`. Mirrors the server `employeeSelect` plus the computed
 * `workStatus` (ADR-017). All expanded ADR-015 fields are nullable.
 */
export interface Employee {
  id: string;
  userId: string;
  companyId: string;
  /** Human-readable code (e.g. `EMP0001`). */
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  profilePicture: string | null;
  panNumber: string | null;
  uanNumber: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  departmentId: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  employmentType: EmploymentType | null;
  workingDaysPerWeek: number | null;
  managerId: string | null;
  about: string | null;
  whatILove: string | null;
  hobbies: string | null;
  skills: string[];
  certifications: string[];
  createdAt: string;
  updatedAt: string;
  user: EmployeeUser;
  /** Computed live status (ADR-017); derived server-side, never stored. */
  workStatus: WorkStatus;
}

/** A department, for the directory filter and the department badge/label. */
export interface Department {
  id: string;
  name: string;
  description: string | null;
}

/** Cursor-paginated envelope meta (ADR-010). */
export interface PageMeta {
  nextCursor: string | null;
  limit: number;
}

/** A page of directory rows plus its pagination meta. */
export interface EmployeePage {
  data: Employee[];
  meta: PageMeta;
}

/** Query params for the admin directory list. */
export interface ListEmployeesParams {
  search?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  role?: Role;
  cursor?: string;
  limit?: number;
}

/** Fetch the caller's own profile (`GET /employees/me`). */
export function getMe(): Promise<Employee> {
  return api.get<Employee>(API_ROUTES.employees.me);
}

/** Restricted self-update of the ADR-015 self-editable subset (`PUT /employees/me`). */
export function updateMe(body: UpdateProfileInput): Promise<Employee> {
  return api.put<Employee>(API_ROUTES.employees.me, body);
}

/** Fetch a single employee by internal id (`GET /employees/:id`). */
export function getEmployee(id: string): Promise<Employee> {
  return api.get<Employee>(API_ROUTES.employees.byId(id));
}

/**
 * Upload/replace a profile picture (`PATCH /employees/:id/profile-picture`).
 *
 * The server accepts a JSON `{ url }` body (multipart storage is stubbed, see
 * `apps/api/src/lib/upload.ts`); the picked image is read as a data URL so the
 * new picture round-trips end-to-end in the demo. Returns the stored URL.
 */
export async function uploadProfilePicture(id: string, file: File): Promise<string> {
  const url = await fileToDataUrl(file);
  const { profilePictureUrl } = await api.patch<{ profilePictureUrl: string }>(
    API_ROUTES.employees.profilePicture(id),
    { url },
  );
  return profilePictureUrl;
}

/** Read a picked image `File` into a base64 data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Admin/HR directory listing with search + filters + cursor pagination
 * (`GET /employees`). Returns rows **and** `meta.nextCursor` (ADR-010).
 *
 * The shared `api` client unwraps `data` and drops `meta`, but the directory
 * needs the cursor — so this reads the full envelope directly (still sending the
 * in-memory access token from S10's auth store, ADR-007) and surfaces
 * `error.message` as an {@link ApiError} on failure, matching the client.
 */
export async function listEmployees(params: ListEmployeesParams = {}): Promise<EmployeePage> {
  const url = new URL(`${API_BASE_URL}${API_ROUTES.employees.base}`);
  const query: Record<string, string | number | undefined> = {
    search: params.search,
    departmentId: params.departmentId,
    employmentType: params.employmentType,
    role: params.role,
    cursor: params.cursor,
    limit: params.limit ?? DEFAULT_LIMIT,
  };
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = authStore.getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url.toString(), { headers, credentials: 'include' });
  const json = (await response.json()) as ApiResponse<Employee[]>;

  if (!json.success) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'Failed to load employees',
      json.error?.details,
      response.status,
    );
  }

  return {
    data: json.data,
    meta: {
      nextCursor: (json.meta?.nextCursor as string | undefined) ?? null,
      limit: (json.meta?.limit as number | undefined) ?? (params.limit ?? DEFAULT_LIMIT),
    },
  };
}

/** List all departments (`GET /departments`), sorted by name server-side. */
export function listDepartments(): Promise<Department[]> {
  return api.get<Department[]>(API_ROUTES.departments.base);
}

/** Convenience: an employee's full display name. */
export function fullName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`.trim();
}

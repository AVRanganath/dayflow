/**
 * Employee service — all Prisma access for the employee module lives here
 * (controllers stay thin). Implements admin creation with auto-generated
 * credentials (ADR-012), the admin directory with computed `workStatus`
 * (ADR-017), self + admin profile reads/updates over the expanded ADR-015
 * fields, and the row-level access rule.
 */
import type { Prisma } from '@dayflow/db';
import type {
  AdminUpdateEmployeeInput,
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateProfileInput,
  WorkStatus,
} from '@dayflow/shared';
import type { AuthUser } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { generateLoginId, generateTempPassword } from '../../lib/login-id.js';
import { hashPassword } from '../../lib/password.js';
import { cursorArgs, buildPage } from '../../lib/pagination.js';
import { computeWorkStatus, computeWorkStatuses } from '../../lib/work-status.js';

/** Management roles that may read/edit any employee (ADR-001). */
const MANAGEMENT_ROLES: readonly AuthUser['role'][] = ['ADMIN', 'HR'];

/** Fields returned for an employee record (never includes `passwordHash`). */
const employeeSelect = {
  id: true,
  userId: true,
  companyId: true,
  employeeId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  personalEmail: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  maritalStatus: true,
  nationality: true,
  address: true,
  city: true,
  state: true,
  country: true,
  zipCode: true,
  profilePicture: true,
  panNumber: true,
  uanNumber: true,
  bankAccountNumber: true,
  bankName: true,
  bankIfsc: true,
  departmentId: true,
  designation: true,
  dateOfJoining: true,
  employmentType: true,
  workingDaysPerWeek: true,
  managerId: true,
  about: true,
  whatILove: true,
  hobbies: true,
  skills: true,
  certifications: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { loginId: true, role: true, mustChangePassword: true, isActive: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeRecord = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

/** An employee record with the computed live status attached (ADR-017). */
export type EmployeeWithStatus = EmployeeRecord & { workStatus: WorkStatus };

/**
 * Resolve the caller's own `Employee` id from `req.user.id` (a `User` id). The
 * auth principal carries the user id + role; the employee id is looked up here.
 *
 * @throws NotFoundError if the user has no linked employee row.
 */
export async function resolveEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!employee) throw new NotFoundError('No employee profile linked to this account');
  return employee.id;
}

/**
 * Row-level access guard (spec: lives in the service). ADMIN/HR may access any
 * record; an EMPLOYEE may access only their own.
 *
 * @throws ForbiddenError when an EMPLOYEE targets someone else's record.
 */
export async function assertCanAccessEmployee(
  reqUser: AuthUser,
  targetEmployeeId: string,
): Promise<void> {
  if (MANAGEMENT_ROLES.includes(reqUser.role)) return;
  const ownId = await resolveEmployeeId(reqUser.id);
  if (ownId !== targetEmployeeId) {
    throw new ForbiddenError('You may only access your own employee record');
  }
}

/** Attach the computed `workStatus` to a single record. */
async function withStatus(record: EmployeeRecord): Promise<EmployeeWithStatus> {
  const workStatus = await computeWorkStatus(record.id);
  return { ...record, workStatus };
}

/**
 * Create an employee (ADR-012): auto-generate `loginId` + a temporary password,
 * hash it, set `mustChangePassword=true`, and create the `User`, `Employee` and
 * the default `LeaveBalance` rows (PAID/SICK/CASUAL) in a single transaction so
 * a partial employee can never exist. Returns the created identity plus the
 * one-time plaintext temporary password.
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  loginId: string;
  role: 'EMPLOYEE' | 'HR';
  temporaryPassword: string;
  mustChangePassword: true;
}> {
  // Uniqueness pre-check (also enforced by DB unique constraints).
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('A user with this email already exists');

  // Single company in the MVP (ADR-016); it drives the Login-ID prefix.
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, loginIdPrefix: true },
  });
  if (!company) throw new NotFoundError('No company configured; cannot create employees');

  // Validate optional FKs up front for clear 400s (vs. opaque FK errors).
  if (input.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept) throw new ValidationError('departmentId does not refer to a real department');
  }
  if (input.managerId) {
    const manager = await prisma.employee.findUnique({ where: { id: input.managerId } });
    if (!manager) throw new ValidationError('managerId does not refer to a real employee');
  }

  const joinDate = new Date(`${input.dateOfJoining}T00:00:00.000Z`);
  const joinYear = joinDate.getUTCFullYear();

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const created = await prisma.$transaction(async (tx) => {
    // Per-company, per-join-year serial: count existing users created for that
    // year's employees + 1. Computed inside the transaction for consistency.
    const yearStart = new Date(Date.UTC(joinYear, 0, 1));
    const yearEnd = new Date(Date.UTC(joinYear + 1, 0, 1));
    const priorCount = await tx.employee.count({
      where: {
        companyId: company.id,
        dateOfJoining: { gte: yearStart, lt: yearEnd },
      },
    });
    const serial = priorCount + 1;
    const loginId = generateLoginId(
      company.loginIdPrefix,
      input.firstName,
      input.lastName,
      joinYear,
      serial,
    );

    const user = await tx.user.create({
      data: {
        email: input.email,
        loginId,
        passwordHash,
        role: input.role,
        mustChangePassword: true,
        // Dev convenience (ADR-003): admin-created users can sign in immediately.
        isEmailVerified: true,
      },
    });

    // employeeId is a required human-readable code; derive it from the loginId
    // serial (unique per company + year). employeeCode mirrors it (ADR-015).
    const employeeId = `EMP${String(serial).padStart(4, '0')}`;

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        companyId: company.id,
        employeeId,
        employeeCode: employeeId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        departmentId: input.departmentId ?? null,
        designation: input.designation ?? null,
        managerId: input.managerId ?? null,
        dateOfJoining: joinDate,
        employmentType: input.employmentType,
      },
      select: { id: true },
    });

    // Default leave balances for the join year (ADR-004: PAID/SICK/CASUAL).
    await tx.leaveBalance.createMany({
      data: [
        { employeeId: employee.id, leaveType: 'PAID', year: joinYear, totalAllowed: 24 },
        { employeeId: employee.id, leaveType: 'SICK', year: joinYear, totalAllowed: 7 },
        { employeeId: employee.id, leaveType: 'CASUAL', year: joinYear, totalAllowed: 7 },
      ],
    });

    return { employeeId: employee.id, loginId, role: user.role };
  });

  return {
    id: created.employeeId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    loginId: created.loginId,
    role: input.role,
    temporaryPassword: tempPassword,
    mustChangePassword: true,
  };
}

/**
 * Admin directory listing (ADMIN/HR). Cursor-paginated, case-insensitive
 * `search` over first/last name + email, AND-combined with `departmentId` /
 * `employmentType` / `role` filters. Each row carries the computed `workStatus`.
 */
export async function listEmployees(
  query: EmployeeListQuery & { cursor?: string; limit: number },
): Promise<{ data: EmployeeWithStatus[]; meta: { nextCursor: string | null; limit: number } }> {
  const filters: Prisma.EmployeeWhereInput[] = [];
  if (query.search) {
    const term = query.search;
    filters.push({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ],
    });
  }
  if (query.departmentId) filters.push({ departmentId: query.departmentId });
  if (query.employmentType) filters.push({ employmentType: query.employmentType });
  if (query.role) filters.push({ user: { role: query.role } });

  const where: Prisma.EmployeeWhereInput = filters.length ? { AND: filters } : {};

  const rows = await prisma.employee.findMany({
    where,
    select: employeeSelect,
    orderBy: { id: 'asc' },
    ...cursorArgs(query.limit, query.cursor),
  });

  const { data, meta } = buildPage(rows, query.limit);
  const statuses = await computeWorkStatuses(data.map((r) => r.id));
  const withStatuses: EmployeeWithStatus[] = data.map((r) => ({
    ...r,
    workStatus: statuses.get(r.id) ?? 'ABSENT',
  }));

  return {
    data: withStatuses,
    meta: { nextCursor: meta.nextCursor ?? null, limit: meta.limit ?? query.limit },
  };
}

/** Fetch the caller's own profile (from a `User` id), with `workStatus`. */
export async function getMe(userId: string): Promise<EmployeeWithStatus> {
  const record = await prisma.employee.findUnique({
    where: { userId },
    select: employeeSelect,
  });
  if (!record) throw new NotFoundError('No employee profile linked to this account');
  return withStatus(record);
}

/** Fetch an employee by id (after the caller passed the row-level guard). */
export async function getById(employeeId: string): Promise<EmployeeWithStatus> {
  const record = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: employeeSelect,
  });
  if (!record) throw new NotFoundError('Employee not found');
  return withStatus(record);
}

/**
 * Self-update, restricted to the ADR-015 self-editable subset. The schema is
 * already `.strict()`, so restricted fields are rejected at the boundary; this
 * only ever writes the whitelisted keys.
 */
export async function updateMeSelf(
  userId: string,
  input: UpdateProfileInput,
): Promise<EmployeeWithStatus> {
  const own = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  if (!own) throw new NotFoundError('No employee profile linked to this account');

  const record = await prisma.employee.update({
    where: { id: own.id },
    data: { ...input },
    select: employeeSelect,
  });
  return withStatus(record);
}

/**
 * Admin/HR full update over the expanded ADR-015 field set incl. the
 * `managerId` self-relation. Validates that `managerId` refers to a real
 * employee and rejects self-referential assignment (an employee cannot manage
 * itself).
 */
export async function updateByIdAdmin(
  employeeId: string,
  input: AdminUpdateEmployeeInput,
): Promise<EmployeeWithStatus> {
  const target = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('Employee not found');

  if (input.managerId !== undefined) {
    if (input.managerId === employeeId) {
      throw new ValidationError('An employee cannot be their own manager');
    }
    const manager = await prisma.employee.findUnique({
      where: { id: input.managerId },
      select: { id: true },
    });
    if (!manager) throw new ValidationError('managerId does not refer to a real employee');
  }

  if (input.departmentId !== undefined) {
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });
    if (!dept) throw new ValidationError('departmentId does not refer to a real department');
  }

  // Normalise the ISO date string to a Date for the `@db.Date` column.
  const { dateOfBirth, ...rest } = input;
  const data: Prisma.EmployeeUpdateInput = {
    ...rest,
    ...(dateOfBirth !== undefined ? { dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`) } : {}),
  };

  const record = await prisma.employee.update({
    where: { id: employeeId },
    data,
    select: employeeSelect,
  });
  return withStatus(record);
}

/**
 * Set an employee's profile picture URL and return the stored URL. Row-level
 * access is enforced by the caller (ADMIN/HR or self).
 */
export async function setProfilePicture(
  employeeId: string,
  url: string,
): Promise<{ profilePictureUrl: string }> {
  const target = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('Employee not found');

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: { profilePicture: url },
    select: { profilePicture: true },
  });
  return { profilePictureUrl: updated.profilePicture ?? url };
}

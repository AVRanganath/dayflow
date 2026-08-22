/**
 * Employee controllers — thin: read the (already-validated) request, call the
 * service, and write the envelope via `sendSuccess`. No Prisma here.
 */
import type { Request, Response } from 'express';
import type {
  AdminUpdateEmployeeInput,
  CreateEmployeeInput,
  EmployeeListQuery,
  PaginationQuery,
  UpdateProfileInput,
} from '@dayflow/shared';
import { sendSuccess } from '../../lib/http.js';
import { UnauthorizedError } from '../../lib/errors.js';
import type { AuthUser } from '../../middleware/auth.js';
import { resolveProfilePictureUrl, type ProfilePictureUrlInput } from '../../lib/upload.js';
import { requestContext, writeAudit } from '../audit/audit.service.js';
import * as employeeService from './employee.service.js';

/** Assert `req.user` is present (set by `requireAuth`) and return it. */
function requireUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user;
}

/** POST /employees — ADMIN/HR create (ADR-012). */
export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateEmployeeInput;
  const result = await employeeService.createEmployee(body);
  sendSuccess(res, result, 201);
}

/** GET /employees — ADMIN/HR directory with pagination/search/filters. */
export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as EmployeeListQuery & PaginationQuery;
  const { data, meta } = await employeeService.listEmployees({
    search: query.search,
    departmentId: query.departmentId,
    employmentType: query.employmentType,
    role: query.role,
    cursor: query.cursor,
    limit: query.limit,
  });
  sendSuccess(res, data, 200, meta);
}

/** GET /employees/me — caller's own profile. */
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const data = await employeeService.getMe(user.id);
  sendSuccess(res, data);
}

/** PUT /employees/me — restricted self-update (ADR-015 subset). */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as UpdateProfileInput;
  const data = await employeeService.updateMeSelf(user.id, body);
  sendSuccess(res, data);
}

/** GET /employees/:id — ADMIN/HR or self (row-level check in the service). */
export async function getById(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const id = req.params.id as string;
  await employeeService.assertCanAccessEmployee(user, id);
  const data = await employeeService.getById(id);
  sendSuccess(res, data);
}

/** PUT /employees/:id — ADMIN/HR full update (ADR-015). */
export async function updateById(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const body = req.body as AdminUpdateEmployeeInput;
  const data = await employeeService.updateByIdAdmin(id, body);
  // S09 audit (differentiator #3): an admin editing someone else's record is a
  // sensitive mutation. `newValues` is the submitted patch — the pre-image is not
  // read back, since the service returns only the updated row.
  void writeAudit({
    userId: requireUser(req).id,
    action: 'EMPLOYEE_UPDATED',
    entity: 'Employee',
    entityId: id,
    newValues: body,
    ...requestContext(req),
  });
  sendSuccess(res, data);
}

/** PATCH /employees/:id/profile-picture — ADMIN/HR or self. */
export async function setProfilePicture(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const id = req.params.id as string;
  await employeeService.assertCanAccessEmployee(user, id);
  const url = resolveProfilePictureUrl(req.body as ProfilePictureUrlInput);
  const data = await employeeService.setProfilePicture(id, url);
  sendSuccess(res, data);
}

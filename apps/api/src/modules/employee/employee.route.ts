/**
 * Employee router, mounted at `/api/v1/employees`. Every route is behind
 * `requireAuth`; admin-only routes add `requireRole('ADMIN','HR')` (ADR-001).
 * `/me` routes are declared before `/:id` so `me` is never treated as an id.
 *
 * NOTE: `requireAuth`/`requireRole` are S04-owned stubs that throw until S04
 * lands — protected routes cannot be exercised at runtime yet (see S05 log).
 */
import { Router } from 'express';
import {
  AdminUpdateEmployeeSchema,
  CreateEmployeeSchema,
  EmployeeListQuerySchema,
  PaginationQuerySchema,
  UpdateProfileSchema,
} from '@dayflow/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../lib/validate.js';
import { asyncHandler } from '../../lib/http.js';
import { ProfilePictureUrlSchema } from '../../lib/upload.js';
import * as controller from './employee.controller.js';

export const employeesRouter: Router = Router();

// All employee routes require authentication.
employeesRouter.use(requireAuth);

// --- Self-scoped routes (any authenticated role) — declared before `/:id`. ---
employeesRouter.get('/me', asyncHandler(controller.getMe));
employeesRouter.put('/me', validate(UpdateProfileSchema), asyncHandler(controller.updateMe));

// --- Admin directory + creation (ADMIN/HR). ---
employeesRouter.get(
  '/',
  requireRole('ADMIN', 'HR'),
  validate(EmployeeListQuerySchema.merge(PaginationQuerySchema), 'query'),
  asyncHandler(controller.list),
);
employeesRouter.post(
  '/',
  requireRole('ADMIN', 'HR'),
  validate(CreateEmployeeSchema),
  asyncHandler(controller.create),
);

// --- By-id: read is ADMIN/HR-or-self (row-level in service); update is ADMIN/HR. ---
employeesRouter.get('/:id', asyncHandler(controller.getById));
employeesRouter.put(
  '/:id',
  requireRole('ADMIN', 'HR'),
  validate(AdminUpdateEmployeeSchema),
  asyncHandler(controller.updateById),
);
employeesRouter.patch(
  '/:id/profile-picture',
  validate(ProfilePictureUrlSchema),
  asyncHandler(controller.setProfilePicture),
);

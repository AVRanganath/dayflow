/**
 * Company router, mounted at `/api/v1/company` (ADR-016). `GET` is any auth;
 * `PUT` is ADMIN-only (not HR — company/system settings are ADMIN scope per
 * ADR-001).
 */
import { Router } from 'express';
import { UpdateCompanySchema } from '@dayflow/shared';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../lib/validate.js';
import { asyncHandler } from '../../lib/http.js';
import * as controller from './company.controller.js';

export const companyRouter: Router = Router();

companyRouter.use(requireAuth);
companyRouter.get('/', asyncHandler(controller.get));
companyRouter.put(
  '/',
  requireRole('ADMIN'),
  validate(UpdateCompanySchema),
  asyncHandler(controller.update),
);

/**
 * Department router, mounted at `/api/v1/departments`. `GET /` lists departments
 * for any authenticated role (dashboards/directory/profile forms consume it).
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/http.js';
import * as controller from './department.controller.js';

export const departmentsRouter: Router = Router();

departmentsRouter.use(requireAuth);
departmentsRouter.get('/', asyncHandler(controller.list));

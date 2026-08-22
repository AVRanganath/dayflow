/**
 * `/api/v1/payroll` router (S08). Mounted by `routes/index.ts`.
 *
 * Route-ordering note: `/:id/payslip` and `/:employeeId/salary-structure` both
 * have a leading `:param` segment but differ in the literal segment that
 * follows ("payslip" vs "salary-structure"), so Express does not actually
 * confuse them — still, `/:id/payslip` is registered first per the session
 * spec's explicit ordering guidance, to keep the more specific/sensitive
 * (ownership-checked) route unambiguous at a glance.
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as payrollController from './payroll.controller.js';

export const payrollRouter = Router();

payrollRouter.get('/me', requireAuth, payrollController.getMyPayroll);
payrollRouter.get('/', requireAuth, requireRole('ADMIN', 'HR'), payrollController.listPayroll);
payrollRouter.get('/:id/payslip', requireAuth, payrollController.getPayslip);
payrollRouter.get(
  '/:employeeId/salary-structure',
  requireAuth,
  requireRole('ADMIN'),
  payrollController.getSalaryStructure,
);
payrollRouter.put(
  '/:employeeId/salary-structure',
  requireAuth,
  requireRole('ADMIN'),
  payrollController.updateSalaryStructure,
);

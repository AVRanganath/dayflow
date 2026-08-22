/**
 * Base router, mounted at `/api/v1` (`API_BASE`) by `app.ts`. Feature routers
 * (auth, employees, attendance, leaves, payroll, notifications, events) are
 * mounted here by S04–S09.
 */
import { Router } from 'express';
import type { SuccessResponse } from '@dayflow/shared';
import { authRouter } from '../modules/auth/auth.routes.js';
import { employeesRouter } from '../modules/employee/employee.route.js';
import { departmentsRouter } from '../modules/department/department.route.js';
import { companyRouter } from '../modules/company/company.route.js';

export const router = Router();

router.get('/health', (_req, res) => {
  const body: SuccessResponse<{ status: 'ok' }> = { success: true, data: { status: 'ok' } };
  res.status(200).json(body);
});

router.use('/auth', authRouter);
router.use('/employees', employeesRouter);
router.use('/departments', departmentsRouter);
router.use('/company', companyRouter);
// TODO(S06): router.use('/attendance', attendanceRouter)
// TODO(S07): router.use('/leaves', leavesRouter)
// TODO(S08): router.use('/payroll', payrollRouter)
// TODO(S09): router.use('/notifications', notificationsRouter); router.use('/events', eventsRouter)

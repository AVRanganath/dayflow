/**
 * Base router, mounted at `/api/v1` (`API_BASE`) by `app.ts`. Feature routers
 * (auth, employees, attendance, leaves, payroll, notifications, events) are
 * mounted here by S04–S09 — do not implement them in S03.
 */
import { Router } from 'express';
import type { SuccessResponse } from '@dayflow/shared';
import { attendanceRouter } from '../modules/attendance/attendance.route.js';

export const router = Router();

router.get('/health', (_req, res) => {
  const body: SuccessResponse<{ status: 'ok' }> = { success: true, data: { status: 'ok' } };
  res.status(200).json(body);
});

// TODO(S04): router.use('/auth', authRouter)
// TODO(S05): router.use('/employees', employeesRouter); router.use('/departments', departmentsRouter); router.use('/company', companyRouter)
router.use('/attendance', attendanceRouter); // S06
// TODO(S07): router.use('/leaves', leavesRouter)
// TODO(S08): router.use('/payroll', payrollRouter)
// TODO(S09): router.use('/notifications', notificationsRouter); router.use('/events', eventsRouter)

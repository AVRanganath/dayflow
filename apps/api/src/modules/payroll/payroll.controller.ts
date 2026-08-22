/**
 * Thin controllers: parse the request, delegate to the service, shape the
 * envelope (or stream the payslip PDF). No Prisma here (plan.md §6).
 */
import type { NextFunction, Request, Response } from 'express';
import type { SuccessResponse } from '@dayflow/shared';
import { PayrollListWithCursorSchema, SalaryStructureSchema } from './payroll.schema.js';
import * as payrollService from './payroll.service.js';

function ok<T>(res: Response, data: T, meta?: SuccessResponse<T>['meta']): void {
  const body: SuccessResponse<T> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(200).json(body);
}

export async function getMyPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await payrollService.getMyPayroll(req.user!.id);
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function listPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = PayrollListWithCursorSchema.parse(req.query);
    const { items, nextCursor } = await payrollService.listPayroll(query);
    ok(res, items, { nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function getSalaryStructure(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await payrollService.getSalaryStructure(req.params.employeeId as string);
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateSalaryStructure(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = SalaryStructureSchema.parse(req.body);
    const data = await payrollService.updateSalaryStructure({
      employeeId: req.params.employeeId as string,
      wage: body.wage,
      config: body.config,
      actorUserId: req.user!.id,
    });
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getPayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buffer, filename } = await payrollService.getPayslipPdf({
      recordId: req.params.id as string,
      requester: req.user!,
    });
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

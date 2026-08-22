/**
 * Department controller — thin: call the service, write the envelope.
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/http.js';
import * as departmentService from './department.service.js';

/** GET /departments — list all departments (any authenticated role). */
export async function list(_req: Request, res: Response): Promise<void> {
  const data = await departmentService.listDepartments();
  sendSuccess(res, data);
}

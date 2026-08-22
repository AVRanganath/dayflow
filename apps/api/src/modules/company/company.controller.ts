/**
 * Company controller — thin: call the service, write the envelope.
 */
import type { Request, Response } from 'express';
import type { UpdateCompanyInput } from '@dayflow/shared';
import { sendSuccess } from '../../lib/http.js';
import * as companyService from './company.service.js';

/** GET /company — the single company row (any authenticated role). */
export async function get(_req: Request, res: Response): Promise<void> {
  const data = await companyService.getCompany();
  sendSuccess(res, data);
}

/** PUT /company — update name/logo/prefix/settings (ADMIN-only). */
export async function update(req: Request, res: Response): Promise<void> {
  const data = await companyService.updateCompany(req.body as UpdateCompanyInput);
  sendSuccess(res, data);
}

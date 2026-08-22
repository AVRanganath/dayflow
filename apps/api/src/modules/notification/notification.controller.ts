/**
 * Notification controllers (S09) — thin handlers over `notification.service.ts`
 * that render the ADR-010 envelope. No Prisma here.
 */
import type { Request, Response } from 'express';
import type { PaginationQuery } from '@dayflow/shared';
import { UnauthorizedError } from '../../lib/errors.js';
import { sendSuccess } from '../../lib/response.js';
import * as service from './notification.service.js';

/** Reads the authenticated `User.id` set by `requireAuth`. */
function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user.id;
}

/** GET /notifications/me — the caller's own notifications, cursor-paginated. */
export async function listMine(req: Request, res: Response): Promise<void> {
  const { cursor, limit } = req.query as unknown as PaginationQuery;
  const { data, meta } = await service.listMine(userId(req), limit, cursor);
  sendSuccess(res, data, 200, meta);
}

/** PATCH /notifications/:id/read — owner only; flips `isRead` to true. */
export async function markRead(req: Request, res: Response): Promise<void> {
  const updated = await service.markRead(userId(req), req.params.id as string);
  sendSuccess(res, updated);
}

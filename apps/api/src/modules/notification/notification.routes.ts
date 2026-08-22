/**
 * Notification router (S09), mounted at `/api/v1/notifications`. Both routes are
 * self-scoped: `requireAuth` establishes who is calling and the service enforces
 * ownership on the mark-read path.
 */
import { Router, type RequestHandler } from 'express';
import { PaginationQuerySchema } from '@dayflow/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../lib/validate.js';
import * as controller from './notification.controller.js';

/** Forwards a rejected promise to `next` (Express 4 does not await handlers). */
function asyncHandler(fn: (...args: Parameters<RequestHandler>) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export const notificationsRouter: Router = Router();

notificationsRouter.get(
  '/me',
  requireAuth,
  validate(PaginationQuerySchema, 'query'),
  asyncHandler(controller.listMine),
);

notificationsRouter.patch('/:id/read', requireAuth, asyncHandler(controller.markRead));

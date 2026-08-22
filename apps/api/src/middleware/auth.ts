/**
 * Auth middleware — TYPED STUBS ONLY (S03 scope). S04 fills in real JWT
 * verification (ADR-007: access token from `Authorization: Bearer <token>`).
 *
 * Feature sessions (S05–S08) should import `requireAuth` / `requireRole` and the
 * `req.user` typing from here now; the signatures below are final. Until S04 lands,
 * both throw `UnauthorizedError('not implemented')`.
 */
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@dayflow/shared';
import { UnauthorizedError } from '../lib/errors.js';

/** Shape of the authenticated principal attached to `req.user` by `requireAuth`. */
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Verifies the access token and sets `req.user`. STUB — implemented in S04. */
export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  throw new UnauthorizedError('requireAuth is not implemented yet (see S04)');
}

/** Restricts a route to the given roles; must run after `requireAuth`. STUB — implemented in S04. */
export function requireRole(..._roles: Role[]) {
  return (_req: Request, _res: Response, _next: NextFunction): void => {
    throw new UnauthorizedError('requireRole is not implemented yet (see S04)');
  };
}

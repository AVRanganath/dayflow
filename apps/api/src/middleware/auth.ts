/**
 * Auth middleware (ADR-001/007). `requireAuth` verifies the access token from the
 * `Authorization: Bearer` header and attaches `req.user`; `requireRole` gates a route
 * to a set of roles and must run after `requireAuth`. Imported by S05–S08.
 */
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@dayflow/shared';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import { verifyAccess } from '../lib/jwt.js';

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

/**
 * Verifies the `Authorization: Bearer <token>` access token and sets `req.user`.
 * @throws {UnauthorizedError} When the header is missing/malformed or the token is invalid/expired.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new UnauthorizedError('Missing access token');

  const payload = verifyAccess(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
}

/**
 * Restricts a route to the given roles; must run after `requireAuth`.
 * @param roles - Allowed roles (e.g. `requireRole('ADMIN', 'HR')`).
 * @throws {UnauthorizedError} When `requireAuth` did not run first.
 * @throws {ForbiddenError} When `req.user.role` is not in `roles`.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to access this resource');
    }
    next();
  };
}

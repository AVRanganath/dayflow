/**
 * JWT sign/verify helpers (ADR-007). Access tokens are short-lived (15m, JSON
 * body) and refresh tokens long-lived (7d, HttpOnly cookie). Secrets + expiries
 * come from the validated `env`. Every refresh token carries a `jti` so it can be
 * individually blacklisted on logout.
 */
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { Role } from '@dayflow/shared';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

/** Claims embedded in every access token. */
export interface AccessTokenPayload {
  /** User id (`User.id`). */
  sub: string;
  /** Linked `Employee.id`, when the user has an employee profile. */
  employeeId: string | null;
  /** RBAC role. */
  role: Role;
}

/** Claims embedded in every refresh token. */
export interface RefreshTokenPayload {
  /** User id (`User.id`). */
  sub: string;
  /** RBAC role. */
  role: Role;
  /** Unique token id — the value blacklisted in Redis on logout. */
  jti: string;
}

/**
 * Signs a 15-minute access token.
 * @param payload - User id, linked employee id, and role.
 * @returns A signed JWT string for the `Authorization: Bearer` header.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

/**
 * Signs a 7-day refresh token with a fresh `jti` (used for blacklisting).
 * @param payload - User id and role; `jti` is generated when omitted.
 * @returns A signed refresh JWT to set as the HttpOnly cookie.
 */
export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, 'jti'> & { jti?: string },
): string {
  const jti = payload.jti ?? randomUUID();
  const full: RefreshTokenPayload = { sub: payload.sub, role: payload.role, jti };
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'] };
  return jwt.sign(full, env.JWT_REFRESH_SECRET, options);
}

/**
 * Verifies an access token.
 * @param token - The raw JWT from the `Authorization` header.
 * @returns The decoded {@link AccessTokenPayload}.
 * @throws {UnauthorizedError} When the token is missing, malformed, or expired.
 */
export function verifyAccess(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string') throw new Error('unexpected token payload');
    const { sub, employeeId, role } = decoded as jwt.JwtPayload & AccessTokenPayload;
    return { sub, employeeId: employeeId ?? null, role };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Verifies a refresh token.
 * @param token - The raw refresh JWT from the cookie.
 * @returns The decoded {@link RefreshTokenPayload} (includes `jti` and `exp`).
 * @throws {UnauthorizedError} When the token is missing, malformed, or expired.
 */
export function verifyRefresh(token: string): RefreshTokenPayload & { exp: number } {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (typeof decoded === 'string') throw new Error('unexpected token payload');
    const { sub, role, jti, exp } = decoded as jwt.JwtPayload & RefreshTokenPayload;
    if (!jti || typeof exp !== 'number') throw new Error('missing jti/exp');
    return { sub, role, jti, exp };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

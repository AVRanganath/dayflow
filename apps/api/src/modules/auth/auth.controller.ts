/**
 * Auth controllers — thin HTTP glue (plan.md §6). Each handler parses the request,
 * delegates to `auth.service`, sets/clears the refresh cookie (ADR-007), and sends
 * the ADR-010 envelope via `sendSuccess`. No Prisma or business logic here.
 */
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SigninInput,
  SignupInput,
} from '@dayflow/shared';
import { env } from '../../config/env.js';
import { sendSuccess } from '../../lib/response.js';
import { UnauthorizedError } from '../../lib/errors.js';
import * as authService from './auth.service.js';

/** Name of the HttpOnly refresh-token cookie (ADR-007). */
export const REFRESH_COOKIE = 'dayflow_rt';

/** Cookie attributes for the refresh token (ADR-007): HttpOnly, Strict, Secure-in-prod. */
function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/** Wraps an async handler so rejected promises reach the Express error middleware (Express 4). */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** `POST /auth/signup` — company/admin onboarding (ADR-012). Sets the refresh cookie; 201. */
export const signup = asyncHandler(async (req, res) => {
  const body = req.body as SignupInput;
  const { user, company, tokens } = await authService.signup(body);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { company, user, accessToken: tokens.accessToken }, 201);
});

/** `POST /auth/signin` — email-or-loginId credential login. Sets the refresh cookie; 200. */
export const signin = asyncHandler(async (req, res) => {
  const body = req.body as SigninInput;
  const { user, tokens } = await authService.signin(body);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { user, accessToken: tokens.accessToken }, 200);
});

/** `POST /auth/change-password` — requireAuth; verifies current, clears mustChangePassword. */
export const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as ChangePasswordInput;
  await authService.changePassword(req.user.id, body);
  sendSuccess(res, { message: 'Password changed successfully', mustChangePassword: false }, 200);
});

/** `POST /auth/refresh` — reads the HttpOnly cookie, rotates, sets a new cookie; 200. */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new UnauthorizedError('Missing refresh token');
  const tokens = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { accessToken: tokens.accessToken }, 200);
});

/** `POST /auth/logout` — clears the cookie and blacklists the token in Redis; 200. */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  sendSuccess(res, { message: 'Logged out successfully' }, 200);
});

/** `GET /auth/verify-email/:token` — marks the email verified; 200. */
export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.params.token;
  if (!token) throw new UnauthorizedError('Missing verification token');
  await authService.verifyEmail(token);
  sendSuccess(res, { message: 'Email verified successfully' }, 200);
});

/** `POST /auth/forgot-password` — generic response, logs reset link (no enumeration); 200. */
export const forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body as ForgotPasswordInput;
  await authService.forgotPassword(body);
  sendSuccess(res, { message: 'Password reset link sent if email exists' }, 200);
});

/** `POST /auth/reset-password` — validates the token + expiry, sets the new hash; 200. */
export const resetPassword = asyncHandler(async (req, res) => {
  const body = req.body as ResetPasswordInput;
  await authService.resetPassword(body);
  sendSuccess(res, { message: 'Password reset successfully' }, 200);
});

/**
 * Auth router, mounted at `/api/v1/auth`. Wires the seven auth endpoints, applies a
 * tighter rate limit to every route (ADR-007/012), and validates each write body
 * against its shared schema. Layering: route → controller → service.
 */
import { Router } from 'express';
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SigninSchema,
  SignupSchema,
} from '@dayflow/shared';
import { validate } from '../../middleware/validate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { requireAuth } from '../../middleware/auth.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

/** Tighter limit for auth routes (10 requests / minute per IP). */
const authLimiter = rateLimit({ windowSeconds: 60, max: 10 });
authRouter.use(authLimiter);

authRouter.post('/signup', validate(SignupSchema), controller.signup);
authRouter.post('/signin', validate(SigninSchema), controller.signin);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post(
  '/change-password',
  requireAuth,
  validate(ChangePasswordSchema),
  controller.changePassword,
);
authRouter.get('/verify-email/:token', controller.verifyEmail);
authRouter.post('/forgot-password', validate(ForgotPasswordSchema), controller.forgotPassword);
authRouter.post('/reset-password', validate(ResetPasswordSchema), controller.resetPassword);

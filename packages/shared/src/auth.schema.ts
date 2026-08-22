/**
 * @dayflow/shared — authentication schemas (ADR-012).
 *
 * Employee self-signup is disabled. The public signup endpoint is company/admin
 * onboarding only; regular employees are created by Admin/HR (see employee.schema).
 * Login accepts an email OR a system-generated Login ID.
 */
import { z } from 'zod';

/** Reused password rule: min 8 chars. */
const password = z.string().min(8, 'Password must be at least 8 characters');

/**
 * Company/admin onboarding body (ADR-012). Creates the first ADMIN user and the
 * Company. Allowed only while no ADMIN exists (else 403 REGISTRATION_CLOSED).
 */
export const SignupSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  adminEmail: z.string().email(),
  password,
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});
export type SignupInput = z.infer<typeof SignupSchema>;

/**
 * Sign-in credentials. `identifier` is the user's email **or** their Login ID
 * (`OIJODO20220001` format, ADR-012); the server resolves which.
 */
export const SigninSchema = z.object({
  identifier: z.string().min(1, 'Email or Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});
export type SigninInput = z.infer<typeof SigninSchema>;

/**
 * Change password (ADR-012). Clears `mustChangePassword` on success — used for the
 * forced first-login change of a system-generated password.
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/** Refresh-token body. The refresh token normally rides in an HttpOnly cookie (ADR-007). */
export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

/** Forgot-password request. */
export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/** Reset-password with an emailed token. */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

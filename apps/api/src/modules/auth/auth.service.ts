/**
 * Auth service — all authentication business logic (ADR-003/007/012). Owns bcrypt
 * hashing, JWT issue/rotate/blacklist, the onboarding transaction, and the
 * email-verify + password-reset flows. Controllers call these; nothing here touches
 * Express. All Prisma access lives in this file.
 */
import { randomUUID } from 'node:crypto';
import type { Prisma, User } from '@prisma/client';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SigninInput,
  SignupInput,
  Role,
} from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { comparePassword, hashPassword } from '../../lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
  type RefreshTokenPayload,
} from '../../lib/jwt.js';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';

/** Redis key prefix for blacklisted refresh-token jtis. */
const BLACKLIST_PREFIX = 'auth:blacklist:';

/** Public (password-free) user shape returned to clients. */
export interface PublicUser {
  id: string;
  email: string;
  loginId: string;
  role: Role;
  mustChangePassword: boolean;
  isEmailVerified: boolean;
}

/** A freshly issued token pair. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Strips secret columns from a `User` before returning it. */
function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    loginId: user.loginId,
    role: user.role as Role,
    mustChangePassword: user.mustChangePassword,
    isEmailVerified: user.isEmailVerified,
  };
}

/** Signs an access + refresh token pair for a user (with its linked employee id). */
async function issueTokens(user: User): Promise<TokenPair> {
  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const accessToken = signAccessToken({
    sub: user.id,
    employeeId: employee?.id ?? null,
    role: user.role as Role,
  });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role as Role });
  return { accessToken, refreshToken };
}

/**
 * Company/admin onboarding (ADR-012). Allowed only while no ADMIN exists; creates
 * the Company, the first ADMIN `User`, and its linked `Employee` in one transaction.
 * @param input - Onboarding body (company name, admin email, password, name).
 * @returns The public admin user, the company, and a fresh token pair.
 * @throws {ForbiddenError} `REGISTRATION_CLOSED` once any ADMIN exists.
 * @throws {ConflictError} When the admin email is already taken.
 */
export async function signup(input: SignupInput): Promise<{
  user: PublicUser;
  company: { id: string; name: string; loginIdPrefix: string };
  tokens: TokenPair;
}> {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount > 0) {
    // Use the API-documented error code (ADR-012) while keeping 403 status.
    throw new AppError(
      403,
      'REGISTRATION_CLOSED',
      'An admin already exists. Public registration is closed.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (existing) {
    throw new ConflictError('A user with this email already exists.');
  }

  const passwordHash = await hashPassword(input.password);
  const loginIdPrefix = 'OI';
  const year = new Date().getFullYear();
  // Admin login id: prefix + first-two(first)+first-two(last) + year + 0001.
  const loginId =
    `${loginIdPrefix}${input.firstName.slice(0, 2).toUpperCase().padEnd(2, 'X')}` +
    `${input.lastName.slice(0, 2).toUpperCase().padEnd(2, 'X')}${year}0001`;

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.companyName,
        loginIdPrefix,
        settings: {
          pfEmployeePct: 12,
          pfEmployerPct: 12,
          professionalTax: 200,
          workingDaysPerWeek: 5,
          basicPct: 50,
          hraPct: 50,
          performanceBonusPct: 8.33,
          ltaPct: 8.33,
          standardAllowance: 4167,
        } satisfies Prisma.InputJsonValue,
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.adminEmail,
        loginId,
        passwordHash,
        role: 'ADMIN',
        // Admin chose their own password during onboarding — no forced change.
        mustChangePassword: false,
        // Dev: unblock login instantly (ADR-003).
        isEmailVerified: env.NODE_ENV === 'development',
      },
    });

    await tx.employee.create({
      data: {
        userId: user.id,
        companyId: company.id,
        employeeId: 'EMP001',
        employeeCode: 'EMP001',
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.adminEmail,
        dateOfJoining: new Date(),
        employmentType: 'FULL_TIME',
      },
    });

    return { company, user };
  });

  const tokens = await issueTokens(result.user);
  return {
    user: toPublicUser(result.user),
    company: {
      id: result.company.id,
      name: result.company.name,
      loginIdPrefix: result.company.loginIdPrefix,
    },
    tokens,
  };
}

/**
 * Verifies credentials by email OR loginId (ADR-012) and issues tokens.
 * @param input - `{ identifier, password }` where identifier is email or loginId.
 * @returns The public user and a token pair.
 * @throws {UnauthorizedError} `INVALID_CREDENTIALS` on any mismatch.
 */
export async function signin(input: SigninInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: input.identifier }, { loginId: input.identifier }] },
  });

  // API-documented code for a credential mismatch (ADR-012).
  const invalid = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');

  if (!user || !user.isActive) throw invalid;

  const ok = await comparePassword(input.password, user.passwordHash);
  if (!ok) throw invalid;

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/**
 * Changes the authenticated user's password and clears `mustChangePassword` (ADR-012).
 * @param userId - The authenticated user id.
 * @param input - Current + new password.
 * @throws {UnauthorizedError} When the current password is wrong.
 * @throws {NotFoundError} When the user no longer exists.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const ok = await comparePassword(input.currentPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}

/**
 * Rotates a refresh token (ADR-007): verifies it, checks the blacklist, blacklists
 * the presented token, and issues a fresh pair.
 * @param token - The refresh JWT from the cookie.
 * @returns A fresh token pair.
 * @throws {UnauthorizedError} When the token is invalid, expired, or blacklisted.
 */
export async function refresh(token: string): Promise<TokenPair> {
  const payload = verifyRefresh(token);
  await assertNotBlacklisted(payload.jti);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid or expired refresh token');

  // Rotate: blacklist the presented token for its remaining lifetime.
  await blacklist(payload.jti, payload.exp);

  return issueTokens(user);
}

/**
 * Blacklists a refresh token on logout for its remaining lifetime (ADR-007).
 * @param token - The refresh JWT from the cookie (may be absent).
 */
export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  let payload: RefreshTokenPayload & { exp: number };
  try {
    payload = verifyRefresh(token);
  } catch {
    // Already invalid/expired — nothing to blacklist.
    return;
  }
  await blacklist(payload.jti, payload.exp);
}

/** Adds a jti to the Redis blacklist with a TTL equal to its remaining lifetime. */
async function blacklist(jti: string, exp: number): Promise<void> {
  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;
  try {
    await redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', ttl);
  } catch (err) {
    logger.warn({ err }, 'failed to blacklist refresh token');
  }
}

/** Throws if the jti is blacklisted; fails open if Redis is unavailable. */
async function assertNotBlacklisted(jti: string): Promise<void> {
  try {
    const hit = await redis.get(`${BLACKLIST_PREFIX}${jti}`);
    if (hit) throw new UnauthorizedError('Refresh token has been revoked');
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    logger.warn({ err }, 'blacklist check unavailable — allowing refresh (fail-open)');
  }
}

/**
 * Marks a user's email verified from a verification token (ADR-003).
 * @param token - The emailed verification token.
 * @throws {NotFoundError} When the token matches no user.
 */
export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });
  if (!user) throw new NotFoundError('Invalid or expired verification token');
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerificationToken: null },
  });
}

/**
 * Starts a password reset (ADR-003). Always resolves silently (no user enumeration);
 * on a hit it sets a token + 1h expiry and logs the reset link via the console notifier.
 * @param input - `{ email }`.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return; // Same generic response regardless — no enumeration.

  const token = randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  // Console notifier (ADR-003): dev logs the reset link instead of sending email.
  logger.info(
    { email: user.email, resetLink: `/reset-password?token=${token}` },
    '[notifier] password reset link (dev console provider)',
  );
}

/**
 * Completes a password reset (ADR-003): validates the token + expiry, sets the new
 * hash, and clears the reset fields.
 * @param input - `{ token, newPassword }`.
 * @throws {UnauthorizedError} When the token is invalid or expired.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await prisma.user.findFirst({ where: { passwordResetToken: input.token } });
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });
}

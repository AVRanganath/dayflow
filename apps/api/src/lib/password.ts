/**
 * Password hashing helpers (plan.md §6 — bcrypt). Wraps `bcryptjs` so the cost
 * factor and algorithm live in one place. Cost 10 balances demo speed and safety.
 */
import bcrypt from 'bcryptjs';

/** bcrypt cost factor (>= 10 per the session spec). */
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password with bcrypt.
 * @param plain - The user-supplied plaintext password.
 * @returns The bcrypt hash to persist as `User.passwordHash`.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * @param plain - The candidate plaintext password.
 * @param hash - The stored bcrypt hash.
 * @returns `true` when the password matches, else `false`.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

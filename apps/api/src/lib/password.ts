/**
 * Password hashing helper (bcrypt). Owned here so employee-create (ADR-012) can
 * hash the temporary password. S04 auth reuses the same primitive when it lands;
 * if S04 introduces its own canonical helper, this can be folded into it.
 */
import bcrypt from 'bcryptjs';

/** Work factor for bcrypt. 10 is a sane default for the demo. */
const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password with bcrypt.
 *
 * @param plain - The plaintext password.
 * @returns The bcrypt hash to persist on `User.passwordHash`.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

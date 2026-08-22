/**
 * Login-ID + temporary-password generation (ADR-012).
 *
 * The Login ID is deterministic and unit-tested: `generateLoginId` is a pure
 * function of its inputs. The temporary password is random and returned to the
 * creator exactly once (never stored in plaintext).
 */

/** Take the first two letters of a name part, uppercase, padded to two chars. */
function nameFragment(part: string): string {
  return part
    .replace(/[^A-Za-z]/g, '')
    .substring(0, 2)
    .toUpperCase()
    .padEnd(2, 'X');
}

/**
 * Build an employee Login ID (ADR-012).
 *
 * Format: `<prefix>` + first-two-of-first + first-two-of-last (uppercased) +
 * 4-digit `joinYear` + 4-digit zero-padded `serial`.
 *
 * @example
 * generateLoginId('OI', 'John', 'Doe', 2022, 1) // 'OIJODO20220001'
 *
 * @param prefix - Company Login-ID prefix (e.g. `OI`).
 * @param firstName - Employee first name.
 * @param lastName - Employee last name.
 * @param joinYear - 4-digit year of joining.
 * @param serial - 1-based serial for that company + join year.
 * @returns The composed Login ID.
 */
export function generateLoginId(
  prefix: string,
  firstName: string,
  lastName: string,
  joinYear: number,
  serial: number,
): string {
  const first = nameFragment(firstName);
  const last = nameFragment(lastName);
  const year = String(joinYear).padStart(4, '0');
  const seq = String(serial).padStart(4, '0');
  return `${prefix.toUpperCase()}${first}${last}${year}${seq}`;
}

/** Character sets for the temporary password (excludes ambiguous chars). */
const PW_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PW_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const PW_DIGITS = '23456789';
const PW_SYMBOLS = '!@#$%&*';

/**
 * Generate a random temporary password (ADR-012). Guaranteed to contain at
 * least one upper, lower, digit and symbol so it satisfies typical policies.
 * The plaintext is returned once to the creator and never persisted.
 *
 * @param length - Total length (default 12, minimum 8).
 */
export function generateTempPassword(length = 12): string {
  const size = Math.max(8, length);
  const all = PW_UPPER + PW_LOWER + PW_DIGITS + PW_SYMBOLS;
  const pick = (set: string): string => set[Math.floor(Math.random() * set.length)] ?? set[0]!;

  const required = [pick(PW_UPPER), pick(PW_LOWER), pick(PW_DIGITS), pick(PW_SYMBOLS)];
  const rest = Array.from({ length: size - required.length }, () => pick(all));
  const chars = [...required, ...rest];

  // Fisher–Yates shuffle so the required chars are not always at the front.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

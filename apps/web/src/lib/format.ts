/**
 * Formatting utilities for currency, dates, durations, and avatars.
 */

export const AVATAR_PALETTE = [
  '#714B67',
  '#10B981',
  '#F59E0B',
  '#8A5B7E',
  '#EF4444',
  '#0EA5E9',
  '#EC4899',
  '#14B8A6',
] as const;

/**
 * Formats a numeric amount in Indian Rupees (INR, ₹) with Indian numbering format.
 * Examples: 50000 -> "₹50,000", 4250000 -> "₹42,50,000", 62450.5 -> "₹62,450.50".
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats duration into a human-readable "Xh Ym" or "Xh" format.
 * @param value Number of hours or minutes
 * @param isMinutes If true, `value` is in minutes; otherwise `value` is in fractional hours
 */
export function formatHours(value: number, isMinutes = false): string {
  if (isNaN(value) || value <= 0) return '0h 0m';
  const totalMinutes = isMinutes ? Math.round(value) : Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Formats a Date or ISO string into a standard readable date.
 * Default: "22 Aug 2026".
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Extracts uppercase initials (up to 2 characters) from a person's full name.
 * Examples: "John Doe" -> "JD", "Sarah" -> "S", "Alice Bob Charlie" -> "AC".
 */
export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0];
  if (!first) return '?';
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1];
  if (!last) return first.slice(0, 1).toUpperCase();
  return (first[0]! + last[0]!).toUpperCase();
}

/**
 * Returns a deterministic avatar background color from the 8-color palette.
 */
export function getAvatarColor(seed: string | number): string {
  if (typeof seed === 'number') {
    const idx = Math.abs(seed) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[idx] || AVATAR_PALETTE[0];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index] || AVATAR_PALETTE[0];
}

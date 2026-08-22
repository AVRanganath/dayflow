import { describe, it, expect } from 'vitest';
import {
  formatINR,
  formatHours,
  formatDate,
  initials,
  getAvatarColor,
  AVATAR_PALETTE,
} from './format.js';

describe('format utils', () => {
  describe('formatINR', () => {
    it('formats regular amounts correctly', () => {
      // Different Node versions handle currency spacing slightly differently, so we check for digits
      expect(formatINR(50000).replace(/\s/g, '')).toContain('₹50,000');
      expect(formatINR(4250000).replace(/\s/g, '')).toContain('₹42,50,000');
    });

    it('formats decimals correctly', () => {
      expect(formatINR(62450.5).replace(/\s/g, '')).toContain('₹62,450.50');
    });

    it('handles NaN', () => {
      expect(formatINR(NaN)).toBe('₹0');
    });
  });

  describe('formatHours', () => {
    it('formats hours from fractional hours', () => {
      expect(formatHours(1.5)).toBe('1h 30m');
      expect(formatHours(2)).toBe('2h');
    });

    it('formats hours from minutes', () => {
      expect(formatHours(90, true)).toBe('1h 30m');
      expect(formatHours(120, true)).toBe('2h');
    });

    it('handles zero or NaN', () => {
      expect(formatHours(0)).toBe('0h 0m');
      expect(formatHours(NaN)).toBe('0h 0m');
      expect(formatHours(-5)).toBe('0h 0m');
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const d = new Date('2026-08-22T00:00:00Z');
      expect(formatDate(d)).toMatch(/22|Aug|2026/); // simple check to avoid timezone mismatch
    });

    it('handles empty or invalid inputs', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate('invalid-date')).toBe('—');
    });
  });

  describe('initials', () => {
    it('extracts initials correctly', () => {
      expect(initials('John Doe')).toBe('JD');
      expect(initials('Sarah')).toBe('SA'); // because of length 1 slice(0, 2)
      expect(initials('Alice Bob Charlie')).toBe('AC');
    });

    it('handles empty strings', () => {
      expect(initials('')).toBe('?');
      expect(initials('   ')).toBe('?');
    });
  });

  describe('getAvatarColor', () => {
    it('returns a color from the palette', () => {
      const color = getAvatarColor('John Doe');
      expect(AVATAR_PALETTE).toContain(color);
    });

    it('is deterministic', () => {
      expect(getAvatarColor('John Doe')).toBe(getAvatarColor('John Doe'));
    });
  });
});

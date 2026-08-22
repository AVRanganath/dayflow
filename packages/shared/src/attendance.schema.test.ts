import { describe, it, expect } from 'vitest';
import {
  CheckInSchema,
  CheckOutSchema,
  AttendanceRangeSchema,
  AttendanceListQuerySchema,
} from './attendance.schema.js';

describe('Attendance Schemas', () => {
  describe('CheckInSchema', () => {
    it('validates a correct payload', () => {
      expect(CheckInSchema.safeParse({ location: 'Office' }).success).toBe(true);
      expect(CheckInSchema.safeParse({ ipAddress: '192.168.1.1' }).success).toBe(true);
    });

    it('rejects invalid ip address', () => {
      expect(CheckInSchema.safeParse({ ipAddress: 'not-an-ip' }).success).toBe(false);
    });
  });

  describe('CheckOutSchema', () => {
    it('validates a correct payload', () => {
      expect(CheckOutSchema.safeParse({ breakMinutes: 30 }).success).toBe(true);
      expect(CheckOutSchema.safeParse({}).success).toBe(true);
    });

    it('rejects negative break minutes', () => {
      expect(CheckOutSchema.safeParse({ breakMinutes: -10 }).success).toBe(false);
    });

    it('rejects fractional break minutes', () => {
      expect(CheckOutSchema.safeParse({ breakMinutes: 10.5 }).success).toBe(false);
    });
  });

  describe('AttendanceRangeSchema', () => {
    it('validates correct ranges', () => {
      expect(AttendanceRangeSchema.safeParse('daily').success).toBe(true);
      expect(AttendanceRangeSchema.safeParse('monthly').success).toBe(true);
      expect(AttendanceRangeSchema.safeParse('weekly').success).toBe(true);
    });

    it('rejects invalid ranges', () => {
      expect(AttendanceRangeSchema.safeParse('yearly').success).toBe(false);
    });
  });

  describe('AttendanceListQuerySchema', () => {
    it('validates valid queries', () => {
      const data = {
        date: '2026-08-22',
        status: 'PRESENT',
      };
      expect(AttendanceListQuerySchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid dates', () => {
      expect(AttendanceListQuerySchema.safeParse({ date: '22-08-2026' }).success).toBe(false);
    });
  });
});

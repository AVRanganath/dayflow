import { describe, it, expect } from 'vitest';
import {
  ApplyLeaveSchema,
  RejectLeaveSchema,
  ApproveLeaveSchema,
  AllocateLeaveSchema,
} from './leave.schema.js';

describe('Leave Schemas', () => {
  describe('ApplyLeaveSchema', () => {
    it('validates a correct payload', () => {
      const data = {
        type: 'SICK',
        startDate: '2026-08-20T00:00:00Z',
        endDate: '2026-08-22T00:00:00Z',
        reason: 'Feeling under the weather',
      };
      expect(ApplyLeaveSchema.safeParse(data).success).toBe(true);
    });

    it('rejects end date before start date', () => {
      const data = {
        type: 'SICK',
        startDate: '2026-08-22T00:00:00Z',
        endDate: '2026-08-20T00:00:00Z',
        reason: 'Feeling under the weather',
      };
      const result = ApplyLeaveSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true);
      }
    });

    it('rejects short reasons', () => {
      const data = {
        type: 'SICK',
        startDate: '2026-08-20T00:00:00Z',
        endDate: '2026-08-22T00:00:00Z',
        reason: 'Sick', // < 10 chars
      };
      expect(ApplyLeaveSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('RejectLeaveSchema', () => {
    it('validates correct rejection', () => {
      expect(RejectLeaveSchema.safeParse({ reason: 'Insufficient balance' }).success).toBe(true);
    });

    it('rejects short reasons', () => {
      expect(RejectLeaveSchema.safeParse({ reason: 'No' }).success).toBe(false);
    });
  });

  describe('ApproveLeaveSchema', () => {
    it('validates approval with or without notes', () => {
      expect(ApproveLeaveSchema.safeParse({ notes: 'Approved as discussed' }).success).toBe(true);
      expect(ApproveLeaveSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('AllocateLeaveSchema', () => {
    it('validates correct allocation', () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'CASUAL',
        totalAllowed: 12,
        year: 2026,
      };
      expect(AllocateLeaveSchema.safeParse(data).success).toBe(true);
    });

    it('rejects negative allowed days', () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'CASUAL',
        totalAllowed: -5,
      };
      expect(AllocateLeaveSchema.safeParse(data).success).toBe(false);
    });
  });
});

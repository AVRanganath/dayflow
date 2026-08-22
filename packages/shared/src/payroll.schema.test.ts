import { describe, it, expect } from 'vitest';
import {
  SalaryConfigSchema,
  SalaryStructureSchema,
  PayrollListQuerySchema,
} from './payroll.schema.js';

describe('Payroll Schemas', () => {
  describe('SalaryConfigSchema', () => {
    it('validates a correct payload', () => {
      const data = {
        basicPct: 50,
        hraPctOfBasic: 40,
        standardAllowance: 2000,
        pfEmployeePct: 12,
      };
      expect(SalaryConfigSchema.safeParse(data).success).toBe(true);
    });

    it('rejects percentages outside 0-100', () => {
      expect(SalaryConfigSchema.safeParse({ basicPct: 110 }).success).toBe(false);
      expect(SalaryConfigSchema.safeParse({ basicPct: -5 }).success).toBe(false);
    });

    it('rejects negative allowances', () => {
      expect(SalaryConfigSchema.safeParse({ standardAllowance: -100 }).success).toBe(false);
      expect(SalaryConfigSchema.safeParse({ professionalTax: -50 }).success).toBe(false);
    });
  });

  describe('SalaryStructureSchema', () => {
    it('validates correct wage', () => {
      const data = {
        wage: 100000,
        config: {
          basicPct: 50,
        },
      };
      expect(SalaryStructureSchema.safeParse(data).success).toBe(true);
    });

    it('rejects negative or zero wage', () => {
      expect(SalaryStructureSchema.safeParse({ wage: 0 }).success).toBe(false);
      expect(SalaryStructureSchema.safeParse({ wage: -100 }).success).toBe(false);
    });
  });

  describe('PayrollListQuerySchema', () => {
    it('validates correct month and year', () => {
      expect(PayrollListQuerySchema.safeParse({ month: 1, year: 2026 }).success).toBe(true);
      expect(PayrollListQuerySchema.safeParse({ month: '12', year: '2026' }).success).toBe(true); // coerced
    });

    it('rejects invalid months and years', () => {
      expect(PayrollListQuerySchema.safeParse({ month: 13 }).success).toBe(false);
      expect(PayrollListQuerySchema.safeParse({ year: 1999 }).success).toBe(false);
    });
  });
});

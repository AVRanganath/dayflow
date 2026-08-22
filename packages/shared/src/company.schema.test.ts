import { describe, it, expect } from 'vitest';
import { CompanySettingsSchema, UpdateCompanySchema } from './company.schema.js';

describe('Company Schemas', () => {
  describe('CompanySettingsSchema', () => {
    it('validates a correct payload', () => {
      const data = {
        pfEmployeePct: 12,
        pfEmployerPct: 12,
        professionalTax: 200,
        defaultWorkingDaysPerWeek: 5,
      };
      expect(CompanySettingsSchema.safeParse(data).success).toBe(true);
    });

    it('rejects percentages outside 0-100', () => {
      expect(CompanySettingsSchema.safeParse({ pfEmployeePct: 110 }).success).toBe(false);
    });

    it('rejects invalid working days', () => {
      expect(CompanySettingsSchema.safeParse({ defaultWorkingDaysPerWeek: 8 }).success).toBe(false);
    });
  });

  describe('UpdateCompanySchema', () => {
    it('validates a correct payload', () => {
      const data = {
        name: 'New Name',
        logoUrl: 'https://example.com/logo.png',
        loginIdPrefix: 'ACME',
        settings: {
          basicPct: 50,
        },
      };
      expect(UpdateCompanySchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid URL', () => {
      expect(UpdateCompanySchema.safeParse({ logoUrl: 'not-a-url' }).success).toBe(false);
    });

    it('rejects too long login id prefix', () => {
      expect(UpdateCompanySchema.safeParse({ loginIdPrefix: 'THISISVERYLONG' }).success).toBe(
        false,
      );
    });
  });
});

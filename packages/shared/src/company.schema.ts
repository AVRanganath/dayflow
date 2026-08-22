/**
 * @dayflow/shared — company & settings schemas (ADR-016).
 *
 * Single-company MVP. Settings drive the Login ID prefix (ADR-012), PF/tax rates, and
 * salary-component defaults (ADR-013). `PUT /company` is ADMIN-only.
 */
import { z } from 'zod';

/** Company-wide settings (PF/tax rates, component defaults, working days). */
export const CompanySettingsSchema = z
  .object({
    pfEmployeePct: z.number().min(0).max(100).optional(),
    pfEmployerPct: z.number().min(0).max(100).optional(),
    professionalTax: z.number().nonnegative().optional(),
    basicPct: z.number().min(0).max(100).optional(),
    hraPctOfBasic: z.number().min(0).max(100).optional(),
    performanceBonusPctOfBasic: z.number().min(0).max(100).optional(),
    ltaPctOfBasic: z.number().min(0).max(100).optional(),
    standardAllowance: z.number().nonnegative().optional(),
    defaultWorkingDaysPerWeek: z.number().int().min(1).max(7).optional(),
  })
  .strict();
export type CompanySettingsInput = z.infer<typeof CompanySettingsSchema>;

/** Update company name / logo / settings (ADMIN-only, ADR-016). */
export const UpdateCompanySchema = z
  .object({
    name: z.string().min(2).optional(),
    logoUrl: z.string().url().optional(),
    loginIdPrefix: z.string().min(1).max(8).optional(),
    settings: CompanySettingsSchema.optional(),
  })
  .strict();
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

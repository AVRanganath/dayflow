/**
 * @dayflow/shared — payroll / salary-structure schemas (ADR-013, ADR-008).
 *
 * The salary structure is Wage-driven (ADR-013): components auto-compute from the
 * monthly wage (Basic 50%, HRA 50% of basic, etc.); Fixed Allowance is the balancer.
 * Only the wage (and optional rate overrides) are set by the admin. Amounts are INR.
 */
import { z } from 'zod';

/**
 * Optional per-employee overrides of the company default salary-component rates
 * (ADR-013/016). Percentages are of the relevant base; fixed amounts are INR.
 */
export const SalaryConfigSchema = z
  .object({
    basicPct: z.number().min(0).max(100).optional(),
    hraPctOfBasic: z.number().min(0).max(100).optional(),
    standardAllowance: z.number().nonnegative().optional(),
    performanceBonusPctOfBasic: z.number().min(0).max(100).optional(),
    ltaPctOfBasic: z.number().min(0).max(100).optional(),
    pfEmployeePct: z.number().min(0).max(100).optional(),
    pfEmployerPct: z.number().min(0).max(100).optional(),
    professionalTax: z.number().nonnegative().optional(),
  })
  .strict();
export type SalaryConfigInput = z.infer<typeof SalaryConfigSchema>;

/** Set/update an employee's salary structure (ADMIN-only, ADR-013). */
export const SalaryStructureSchema = z.object({
  wage: z.number().positive('Monthly wage must be positive'),
  config: SalaryConfigSchema.optional(),
});
export type SalaryStructureInput = z.infer<typeof SalaryStructureSchema>;

/** Query for the admin payroll list. */
export const PayrollListQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});
export type PayrollListQuery = z.infer<typeof PayrollListQuerySchema>;

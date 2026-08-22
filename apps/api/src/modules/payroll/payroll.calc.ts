/**
 * Pure salary math (ADR-013 component engine, ADR-014 payable-days proration).
 *
 * No Prisma, no Express — safe to unit-test in isolation and safe to reuse from
 * the salary-structure service, payslip generation, and the DB seed. All money
 * math uses `Prisma.Decimal`, never floats (plan.md §6).
 */
import { Prisma } from '@dayflow/db';
import type { SalaryConfigInput } from '@dayflow/shared';
import { ValidationError } from '../../lib/errors.js';

/** Company-default component rates (ADR-013/016) used when `cfg` omits a field. */
export const DEFAULT_SALARY_CONFIG: Required<SalaryConfigInput> = {
  basicPct: 50,
  hraPctOfBasic: 50,
  standardAllowance: 4167,
  performanceBonusPctOfBasic: 8.33,
  ltaPctOfBasic: 8.33,
  pfEmployeePct: 12,
  pfEmployerPct: 12,
  professionalTax: 200,
};

const D = (value: number | string | Prisma.Decimal): Prisma.Decimal => new Prisma.Decimal(value);
const money = (value: Prisma.Decimal): Prisma.Decimal => value.toDecimalPlaces(2);

/** The full ADR-013 component breakdown for one employee, one monthly wage. */
export interface SalaryComponents {
  monthlyWage: Prisma.Decimal;
  basic: Prisma.Decimal;
  hra: Prisma.Decimal;
  standardAllowance: Prisma.Decimal;
  performanceBonus: Prisma.Decimal;
  lta: Prisma.Decimal;
  fixedAllowance: Prisma.Decimal;
  gross: Prisma.Decimal;
  pfEmployeePct: Prisma.Decimal;
  pfEmployerPct: Prisma.Decimal;
  professionalTax: Prisma.Decimal;
  pfEmployee: Prisma.Decimal;
  pfEmployer: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  monthlyNet: Prisma.Decimal;
}

/**
 * ADR-013 component engine. Basic = basicPct% of wage; HRA = hraPct% of basic;
 * Performance Bonus / LTA = their pct% of basic; Standard Allowance is a fixed
 * amount; Fixed Allowance is the balancer so earnings sum back to the wage.
 * Deductions: employee/employer PF (% of basic) + a fixed Professional Tax.
 * Never trusts a caller-supplied total — everything derives from `wage` + `cfg`.
 */
export function computeSalary(
  wage: number | Prisma.Decimal,
  cfg: SalaryConfigInput = {},
): SalaryComponents {
  const rates = { ...DEFAULT_SALARY_CONFIG, ...cfg };
  const monthlyWage = D(wage);

  const basic = money(monthlyWage.mul(rates.basicPct).div(100));
  const hra = money(basic.mul(rates.hraPctOfBasic).div(100));
  const standardAllowance = money(D(rates.standardAllowance));
  const performanceBonus = money(basic.mul(rates.performanceBonusPctOfBasic).div(100));
  const lta = money(basic.mul(rates.ltaPctOfBasic).div(100));
  const sumOthers = basic.add(hra).add(standardAllowance).add(performanceBonus).add(lta);
  const fixedAllowance = money(monthlyWage.sub(sumOthers));
  const gross = monthlyWage;

  const pfEmployee = money(basic.mul(rates.pfEmployeePct).div(100));
  const pfEmployer = money(basic.mul(rates.pfEmployerPct).div(100));
  const professionalTax = money(D(rates.professionalTax));
  const totalDeductions = pfEmployee.add(professionalTax);
  const monthlyNet = gross.sub(totalDeductions);

  if (monthlyNet.isNegative()) {
    throw new ValidationError('Computed monthly net salary is negative — check wage/config', {
      wage: monthlyWage.toString(),
      totalDeductions: totalDeductions.toString(),
    });
  }

  return {
    monthlyWage,
    basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    gross,
    pfEmployeePct: D(rates.pfEmployeePct),
    pfEmployerPct: D(rates.pfEmployerPct),
    professionalTax,
    pfEmployee,
    pfEmployer,
    totalDeductions,
    monthlyNet,
  };
}

/**
 * ADR-014 payable-days proration. `payableDays` already has unpaid-leave and
 * missing-attendance days subtracted out (approved PAID/SICK leave still counts
 * as payable — that logic lives where `payableDays` is derived, e.g. the payroll
 * run / seed). Rounds to the nearest whole rupee, matching `docs/API.md §5`.
 */
export function prorateByPayableDays(
  monthlyNet: number | Prisma.Decimal,
  payableDays: number | Prisma.Decimal,
  workingDays: number | Prisma.Decimal,
): Prisma.Decimal {
  const working = D(workingDays);
  if (working.lessThanOrEqualTo(0)) {
    return D(monthlyNet).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  }
  return D(monthlyNet)
    .mul(D(payableDays))
    .div(working)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}

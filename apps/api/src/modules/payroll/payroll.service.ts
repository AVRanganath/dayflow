/**
 * Payroll business logic — the only layer that talks to Prisma for this module
 * (plan.md §6: `route → controller → service → prisma`, no Prisma in controllers).
 */
import { Prisma, type SalaryStructure } from '@dayflow/db';
import type { Role, SalaryConfigInput } from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { DEFAULT_SALARY_CONFIG, computeSalary } from './payroll.calc.js';
import { renderPayslipPdf } from './payslip.pdf.js';
import type { PayrollListWithCursorQuery } from './payroll.schema.js';

const toNum = (d: Prisma.Decimal): number => d.toNumber();
const pad2 = (n: number): string => String(n).padStart(2, '0');
const monthKey = (year: number, month: number): string => `${year}-${pad2(month)}`;

/**
 * S09 audit hook stub (do NOT implement the real audit trail here — see the
 * session file for S08). S09 wires this up to write an `AuditLog` row and fire
 * a notification; until then it is a safe no-op so callers can depend on it now.
 * TODO(S09): persist an AuditLog row + notify() for salary-structure changes.
 */
export function auditPayrollUpdate(_event: {
  actorUserId: string;
  employeeId: string;
  oldValues: SalaryStructure | null;
  newValues: SalaryStructure;
}): void {
  // no-op in S08.
}

/** Shared "earnings + deductions + gross + net" shape reused by `/me` and salary-structure. */
function earningsBlock(s: SalaryStructure): {
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  gross: number;
} {
  return {
    basic: toNum(s.basic),
    hra: toNum(s.hra),
    standardAllowance: toNum(s.standardAllowance),
    performanceBonus: toNum(s.performanceBonus),
    lta: toNum(s.lta),
    fixedAllowance: toNum(s.fixedAllowance),
    gross: toNum(s.monthlyWage),
  };
}

/** Derives PF-employee / deductions / net from a stored `SalaryStructure` row. */
function deductionsAndNet(s: SalaryStructure): {
  pfEmployee: Prisma.Decimal;
  pfEmployer: Prisma.Decimal;
  professionalTax: Prisma.Decimal;
  total: Prisma.Decimal;
  monthlyNet: Prisma.Decimal;
} {
  const pfEmployee = s.basic.mul(s.pfEmployeePct).div(100).toDecimalPlaces(2);
  const pfEmployer = s.basic.mul(s.pfEmployerPct).div(100).toDecimalPlaces(2);
  const total = pfEmployee.add(s.professionalTax);
  const monthlyNet = s.monthlyWage.sub(total);
  return { pfEmployee, pfEmployer, professionalTax: s.professionalTax, total, monthlyNet };
}

async function findEmployeeByUserId(userId: string): Promise<{ id: string }> {
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  if (!employee) throw new NotFoundError('Employee profile not found for this user');
  return employee;
}

/** `GET /payroll/me` — caller's own ADR-013 breakdown + payslip history. Read-only. */
export async function getMyPayroll(userId: string): Promise<unknown> {
  const employee = await findEmployeeByUserId(userId);

  const structure = await prisma.salaryStructure.findUnique({ where: { employeeId: employee.id } });
  if (!structure)
    throw new NotFoundError('Salary structure has not been set up for this employee yet');

  const { pfEmployee, pfEmployer, professionalTax, total, monthlyNet } =
    deductionsAndNet(structure);

  const history = await prisma.payrollRecord.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 24,
  });

  return {
    currency: 'INR',
    monthlyWage: toNum(structure.monthlyWage),
    earnings: earningsBlock(structure),
    deductions: {
      pfEmployee: toNum(pfEmployee),
      professionalTax: toNum(professionalTax),
      total: toNum(total),
    },
    employerContributions: { pfEmployer: toNum(pfEmployer) },
    monthlyNet: toNum(monthlyNet),
    history: history.map((r) => ({
      month: monthKey(r.year, r.month),
      payableDays: toNum(r.payableDays),
      workingDays: r.workingDays,
      netSalary: toNum(r.netSalary),
      status: r.status,
      payslipUrl: `/api/v1/payroll/${r.id}/payslip`,
    })),
  };
}

/** `GET /payroll` — ADMIN/HR list, optional month/year filter, cursor-paginated. */
export async function listPayroll(
  query: PayrollListWithCursorQuery,
): Promise<{ items: unknown[]; nextCursor: string | null }> {
  const where: Prisma.PayrollRecordWhereInput = {};
  if (query.month) where.month = query.month;
  if (query.year) where.year = query.year;

  const records = await prisma.payrollRecord.findMany({
    where,
    include: { employee: { select: { firstName: true, lastName: true, employeeId: true } } },
    orderBy: { id: 'asc' },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = records.length > query.limit;
  const page = hasMore ? records.slice(0, query.limit) : records;
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      employeeId: r.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeCode: r.employee.employeeId,
      month: monthKey(r.year, r.month),
      payableDays: toNum(r.payableDays),
      netSalary: toNum(r.netSalary),
      status: r.status,
    })),
    nextCursor: hasMore && last ? last.id : null,
  };
}

/** Formats a `SalaryStructure` row into the `docs/API.md §5` "Get Salary Structure" shape. */
function toSalaryStructureResponse(s: SalaryStructure): unknown {
  const { pfEmployee, pfEmployer, total: totalDeductions, monthlyNet } = deductionsAndNet(s);
  return {
    currency: 'INR',
    monthlyWage: toNum(s.monthlyWage),
    earnings: {
      basic: {
        computationType: 'PERCENTAGE',
        value: DEFAULT_SALARY_CONFIG.basicPct,
        amount: toNum(s.basic),
      },
      hra: {
        computationType: 'PERCENTAGE',
        value: DEFAULT_SALARY_CONFIG.hraPctOfBasic,
        amount: toNum(s.hra),
      },
      standardAllowance: {
        computationType: 'FIXED',
        value: toNum(s.standardAllowance),
        amount: toNum(s.standardAllowance),
      },
      performanceBonus: {
        computationType: 'PERCENTAGE',
        value: DEFAULT_SALARY_CONFIG.performanceBonusPctOfBasic,
        amount: toNum(s.performanceBonus),
      },
      lta: {
        computationType: 'PERCENTAGE',
        value: DEFAULT_SALARY_CONFIG.ltaPctOfBasic,
        amount: toNum(s.lta),
      },
      fixedAllowance: { computationType: 'BALANCER', amount: toNum(s.fixedAllowance) },
    },
    deductions: {
      pfEmployee: { value: toNum(s.pfEmployeePct), amount: toNum(pfEmployee) },
      pfEmployer: { value: toNum(s.pfEmployerPct), amount: toNum(pfEmployer) },
      professionalTax: { amount: toNum(s.professionalTax) },
    },
    gross: toNum(s.monthlyWage),
    monthlyNet: toNum(monthlyNet),
    totalDeductions: toNum(totalDeductions),
  };
}

/** `GET /payroll/:employeeId/salary-structure` — ADMIN-only (route enforces RBAC). */
export async function getSalaryStructure(employeeId: string): Promise<unknown> {
  const structure = await prisma.salaryStructure.findUnique({ where: { employeeId } });
  if (!structure) throw new NotFoundError('Salary structure not found for this employee');
  return toSalaryStructureResponse(structure);
}

/**
 * `PUT /payroll/:employeeId/salary-structure` — ADMIN-only (route enforces RBAC).
 * Recomputes every component from `wage`/`config` via `computeSalary` — a
 * client can never set component totals directly.
 */
export async function updateSalaryStructure(params: {
  employeeId: string;
  wage: number;
  config?: SalaryConfigInput;
  actorUserId: string;
}): Promise<unknown> {
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    select: { id: true },
  });
  if (!employee) throw new NotFoundError('Employee not found');

  const computed = computeSalary(params.wage, params.config);
  const existing = await prisma.salaryStructure.findUnique({
    where: { employeeId: params.employeeId },
  });

  const data = {
    monthlyWage: computed.monthlyWage,
    basic: computed.basic,
    hra: computed.hra,
    standardAllowance: computed.standardAllowance,
    performanceBonus: computed.performanceBonus,
    lta: computed.lta,
    fixedAllowance: computed.fixedAllowance,
    pfEmployeePct: computed.pfEmployeePct,
    pfEmployerPct: computed.pfEmployerPct,
    professionalTax: computed.professionalTax,
  };

  const structure = await prisma.salaryStructure.upsert({
    where: { employeeId: params.employeeId },
    create: { employeeId: params.employeeId, ...data },
    update: data,
  });

  auditPayrollUpdate({
    actorUserId: params.actorUserId,
    employeeId: params.employeeId,
    oldValues: existing,
    newValues: structure,
  });

  return toSalaryStructureResponse(structure);
}

/**
 * `GET /payroll/:id/payslip` — owner or ADMIN/HR (row-level check here, since
 * RBAC middleware alone can't express "your own record"). Renders the PDF from
 * the already-computed `PayrollRecord` snapshot (ADR-013/014 math was applied
 * when the record was generated — by the payroll run / demo seed).
 */
export async function getPayslipPdf(params: {
  recordId: string;
  requester: { id: string; role: Role };
}): Promise<{ buffer: Buffer; filename: string }> {
  const record = await prisma.payrollRecord.findUnique({
    where: { id: params.recordId },
    include: { employee: { include: { company: true } } },
  });
  if (!record) throw new NotFoundError('Payroll record not found');

  const isOwner = record.employee.userId === params.requester.id;
  const isManagement = params.requester.role === 'ADMIN' || params.requester.role === 'HR';
  if (!isOwner && !isManagement) {
    throw new ForbiddenError('You may only download your own payslip');
  }

  const buffer = await renderPayslipPdf({
    companyName: record.employee.company?.name ?? 'Dayflow HRMS',
    employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
    employeeCode: record.employee.employeeId,
    designation: record.employee.designation,
    month: record.month,
    year: record.year,
    workingDays: record.workingDays,
    payableDays: toNum(record.payableDays),
    earnings: {
      basic: toNum(record.basic),
      hra: toNum(record.hra),
      standardAllowance: toNum(record.standardAllowance),
      performanceBonus: toNum(record.performanceBonus),
      lta: toNum(record.lta),
      fixedAllowance: toNum(record.fixedAllowance),
      gross: toNum(record.grossSalary),
    },
    deductions: {
      pfEmployee: toNum(record.pfEmployee),
      professionalTax: toNum(record.professionalTax),
      total: toNum(record.totalDeductions),
    },
    monthlyNet: toNum(record.grossSalary.sub(record.totalDeductions)),
    netSalary: toNum(record.netSalary),
  });

  const filename = `payslip-${record.employee.employeeId}-${monthKey(record.year, record.month)}.pdf`;
  return { buffer, filename };
}

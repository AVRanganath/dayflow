/**
 * Payroll api layer + salary math (S15).
 *
 * Typed fetchers over the S08 payroll contract (`docs/API.md` §5) plus pure client
 * helpers: the ADR-013 salary-structure recompute (used for the admin edit-modal
 * live preview) and a generic CSV serializer for the admin export (differentiator #5).
 * All amounts are INR (ADR-008). No `any`.
 */
import type { PayrollListQuery, SalaryConfigInput } from '@dayflow/shared';
import { api } from './api/client';
import { authStore } from './auth/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Payroll route builders (mirror `API_ROUTES.payroll` in `@dayflow/shared`).
 *
 * Inlined as string builders rather than importing the shared runtime barrel: `@dayflow/shared`
 * re-exports its modules with `.js` specifiers that Next's webpack cannot resolve against the
 * `.ts` sources, so importing any *value* from it breaks the web build. Type-only imports are
 * erased and remain safe. Keep these paths in sync with the shared `API_ROUTES.payroll`.
 */
const PAYROLL_ROUTES = {
  me: '/payroll/me',
  base: '/payroll',
  salaryStructure: (employeeId: string) => `/payroll/${employeeId}/salary-structure`,
  payslip: (id: string) => `/payroll/${id}/payslip`,
} as const;

/* ------------------------------------------------------------------ *
 * Response types (mirror docs/API.md §5; every amount INR, ADR-008).  *
 * ------------------------------------------------------------------ */

/** Flat earning amounts as returned by `GET /payroll/me` and the payslip. */
export interface PayrollEarnings {
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  gross: number;
}

/** Flat deduction amounts; only `pfEmployee` reduces take-home (ADR-013). */
export interface PayrollDeductions {
  pfEmployee: number;
  professionalTax: number;
  total: number;
}

/** One row in the employee's 12-month salary history. */
export interface PayrollHistoryItem {
  month: string; // "YYYY-MM"
  payableDays: number;
  workingDays: number;
  netSalary: number;
  status: string; // PayrollStatus (e.g. PAID / PENDING / PROCESSED)
  payslipUrl?: string | null;
}

/** `GET /payroll/me` — the current user's salary breakdown + history. */
export interface MyPayroll {
  currency: string;
  monthlyWage: number;
  earnings: PayrollEarnings;
  deductions: PayrollDeductions;
  employerContributions: { pfEmployer: number };
  monthlyNet: number;
  history: PayrollHistoryItem[];
}

/** One row of the admin payroll list (`GET /payroll`). */
export interface PayrollListRow {
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  month: string; // "YYYY-MM"
  payableDays: number;
  gross?: number;
  deductions?: number;
  netSalary: number;
  status: string;
  payrollId?: string;
}

/** A single component in the detailed salary structure (`GET /payroll/:id/salary-structure`). */
export interface SalaryComponent {
  computationType: 'PERCENTAGE' | 'FIXED' | 'BALANCER';
  value?: number;
  amount: number;
}

/** Detailed, component-based salary structure (admin view / edit). */
export interface SalaryStructure {
  currency: string;
  monthlyWage: number;
  earnings: {
    basic: SalaryComponent;
    hra: SalaryComponent;
    standardAllowance: SalaryComponent;
    performanceBonus: SalaryComponent;
    lta: SalaryComponent;
    fixedAllowance: SalaryComponent;
  };
  deductions: {
    pfEmployee: SalaryComponent;
    pfEmployer: SalaryComponent;
    professionalTax: SalaryComponent;
  };
  gross: number;
  monthlyNet: number;
}

/** Payslip payload (`GET /payroll/:id/payslip`) — prorated by payable days (ADR-014). */
export interface Payslip {
  employeeId: string;
  month: string;
  currency: string;
  workingDays: number;
  unpaidLeaveDays: number;
  missingAttendanceDays: number;
  payableDays: number;
  earnings: PayrollEarnings;
  deductions: PayrollDeductions;
  monthlyNet: number;
  netSalary: number;
  payslipUrl?: string | null;
}

/* ------------------------------------------------------------------ *
 * Typed fetchers over the S08 contract.                              *
 * ------------------------------------------------------------------ */

/** Fetch the current user's own payroll breakdown + history (`GET /payroll/me`). */
export function getMyPayroll(): Promise<MyPayroll> {
  return api.get<MyPayroll>(PAYROLL_ROUTES.me);
}

/** Fetch the company payroll list for a month/year (admin, `GET /payroll`). */
export function listPayroll(params?: PayrollListQuery & { cursor?: string }): Promise<PayrollListRow[]> {
  return api.get<PayrollListRow[]>(PAYROLL_ROUTES.base, {
    params: params
      ? {
          month: params.month,
          year: params.year,
          cursor: params.cursor,
        }
      : undefined,
  });
}

/** Fetch one employee's detailed salary structure (admin, `GET /payroll/:id/salary-structure`). */
export function getEmployeePayroll(employeeId: string): Promise<SalaryStructure> {
  return api.get<SalaryStructure>(PAYROLL_ROUTES.salaryStructure(employeeId));
}

/** Persist an employee's salary structure from a new monthly wage (ADMIN-only, ADR-013). */
export function updateSalaryStructure(
  employeeId: string,
  body: { wage: number; config?: SalaryConfigInput },
): Promise<SalaryStructure> {
  // The S08 endpoint takes `monthlyWage` (docs/API.md §5); the shared schema names it
  // `wage`. Send both keys so it works whichever the server accepts.
  return api.put<SalaryStructure>(PAYROLL_ROUTES.salaryStructure(employeeId), {
    monthlyWage: body.wage,
    wage: body.wage,
    ...(body.config ? { config: body.config } : {}),
  });
}

/**
 * Download a payslip PDF as a blob via `GET /payroll/:id/payslip` (auth header attached).
 * Fetched directly (not via the JSON api client) so the binary body is preserved.
 * @param id payroll record id (or employee id, per the S08 route)
 * @param query optional `{ month, year }` selector
 */
export async function downloadPayslip(
  id: string,
  query?: { month?: number; year?: number },
): Promise<Blob> {
  const url = new URL(`${API_BASE_URL}${PAYROLL_ROUTES.payslip(id)}`);
  if (query?.month) url.searchParams.set('month', String(query.month));
  if (query?.year) url.searchParams.set('year', String(query.year));

  const token = authStore.getAccessToken();
  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Failed to download payslip (status ${res.status})`);
  }
  return res.blob();
}

/**
 * Triggers a browser download of a Blob under `filename` (object URL created + revoked).
 * Runs only in the browser.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

/* ------------------------------------------------------------------ *
 * CSV export (differentiator #5) — generic, dependency-free.         *
 * ------------------------------------------------------------------ */

/** A CSV column: a header label + an accessor returning the cell value for a row. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Escapes a single CSV field (quotes it when it contains a comma, quote, or newline). */
function escapeCsvField(input: string | number | null | undefined): string {
  const str = input === null || input === undefined ? '' : String(input);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serializes rows to a CSV string using the given columns (order preserved). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.value(row))).join(','),
  );
  return [headerLine, ...body].join('\n');
}

/** Serializes rows to CSV then triggers a browser download under `filename`. */
export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, filename);
}

/* ------------------------------------------------------------------ *
 * Salary structure recompute (ADR-013) — pure, for the edit preview. *
 * Mirrors the server so the admin sees the numbers S08 will persist.  *
 * ------------------------------------------------------------------ */

/** ADR-013 default component rules (percentages). */
export const SALARY_DEFAULTS = {
  basicPct: 50, // of wage
  hraPctOfBasic: 50, // of basic
  standardAllowance: 4167, // fixed INR
  performanceBonusPctOfBasic: 8.33, // of basic
  ltaPctOfBasic: 8.33, // of basic
  pfEmployeePct: 12, // of basic
  pfEmployerPct: 12, // of basic
  professionalTax: 200, // fixed INR
} as const;

/** Rounds to 2 decimal places (paise), avoiding float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** The recomputed salary numbers previewed in the admin edit modal. */
export interface ComputedSalary {
  wage: number;
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  gross: number;
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  totalDeductions: number;
  monthlyNet: number;
}

/**
 * Recomputes the ADR-013 component breakdown from a monthly wage.
 * Fixed Allowance is the balancer so total earning components === wage. Net (before
 * proration) = gross − employee PF − professional tax. Purely client-side preview;
 * the server value is authoritative.
 */
export function computeSalary(wage: number, config?: SalaryConfigInput): ComputedSalary {
  const cfg = { ...SALARY_DEFAULTS, ...(config ?? {}) };
  const safeWage = Number.isFinite(wage) && wage > 0 ? wage : 0;

  const basic = round2((safeWage * cfg.basicPct) / 100);
  const hra = round2((basic * cfg.hraPctOfBasic) / 100);
  const standardAllowance = round2(cfg.standardAllowance);
  const performanceBonus = round2((basic * cfg.performanceBonusPctOfBasic) / 100);
  const lta = round2((basic * cfg.ltaPctOfBasic) / 100);
  const fixedAllowance = round2(
    safeWage - (basic + hra + standardAllowance + performanceBonus + lta),
  );

  const gross = round2(
    basic + hra + standardAllowance + performanceBonus + lta + fixedAllowance,
  );

  const pfEmployee = round2((basic * cfg.pfEmployeePct) / 100);
  const pfEmployer = round2((basic * cfg.pfEmployerPct) / 100);
  const professionalTax = round2(cfg.professionalTax);
  const totalDeductions = round2(pfEmployee + professionalTax);
  const monthlyNet = round2(gross - totalDeductions);

  return {
    wage: safeWage,
    basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance,
    gross,
    pfEmployee,
    pfEmployer,
    professionalTax,
    totalDeductions,
    monthlyNet,
  };
}

/** Formats a "YYYY-MM" string as a human month, e.g. "2026-07" -> "July 2026". */
export function formatPayMonth(month: string): string {
  const [y, m] = month.split('-').map((p) => Number(p));
  if (!y || !m || m < 1 || m > 12) return month;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

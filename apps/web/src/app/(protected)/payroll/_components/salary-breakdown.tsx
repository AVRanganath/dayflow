'use client';

import React from 'react';
import { formatINR } from '../../../../lib/format';
import type { MyPayroll } from '../../../../lib/payroll';

interface SalaryBreakdownProps {
  /** The salary breakdown to render (from `GET /payroll/me`). */
  payroll: MyPayroll;
  /** Optional payable-days context for the current pay month (ADR-014). */
  payableDays?: { payableDays: number; workingDays: number } | null;
}

interface LineProps {
  label: string;
  amount: number;
  emphasis?: boolean;
  hint?: string;
}

function Line({ label, amount, emphasis = false, hint }: LineProps) {
  return (
    <div
      className={
        'flex items-center justify-between py-2 ' +
        (emphasis ? 'border-t border-border mt-1 pt-3' : 'border-b border-hairline')
      }
    >
      <div className="flex flex-col">
        <span
          className={
            emphasis ? 'text-[13px] font-bold text-text-primary' : 'text-[13px] text-text-secondary'
          }
        >
          {label}
        </span>
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </div>
      <span
        className={
          emphasis
            ? 'text-sm font-bold text-text-primary tabular-nums'
            : 'text-[13px] font-medium text-text-primary tabular-nums'
        }
      >
        {formatINR(amount)}
      </span>
    </div>
  );
}

/**
 * Two-column read-only salary breakdown (ADR-013/014): Earnings (Basic, HRA, Standard
 * Allowance, Performance Bonus, LTA, Fixed Allowance → Gross) and Deductions (PF
 * employee + employer shares, Professional Tax → Total Deductions), plus payable days
 * and a highlighted Net Salary bar. Only the employee PF share reduces take-home. All
 * amounts INR (ADR-008).
 */
export function SalaryBreakdown({ payroll, payableDays }: SalaryBreakdownProps) {
  const { earnings, deductions, employerContributions, monthlyNet } = payroll;

  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
        {/* Earnings */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Earnings
          </h3>
          <Line label="Basic Salary" amount={earnings.basic} />
          <Line label="House Rent Allowance (HRA)" amount={earnings.hra} />
          <Line label="Standard Allowance" amount={earnings.standardAllowance} />
          <Line label="Performance Bonus" amount={earnings.performanceBonus} />
          <Line label="Leave Travel Allowance (LTA)" amount={earnings.lta} />
          <Line label="Fixed Allowance" amount={earnings.fixedAllowance} />
          <Line label="Gross Salary" amount={earnings.gross} emphasis />
        </div>

        {/* Deductions */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-danger">
            Deductions
          </h3>
          <Line
            label="Provident Fund (Employee)"
            amount={deductions.pfEmployee}
            hint="12% of Basic — reduces take-home"
          />
          <Line
            label="Provident Fund (Employer)"
            amount={employerContributions.pfEmployer}
            hint="CTC only — not deducted"
          />
          <Line label="Professional Tax" amount={deductions.professionalTax} />
          <Line label="Total Deductions" amount={deductions.total} emphasis />

          {/* Payable days (ADR-014) */}
          {payableDays && (
            <div className="mt-4 rounded border border-hairline bg-background px-3 py-2.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text-secondary">Payable Days</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {payableDays.payableDays} / {payableDays.workingDays}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-text-muted">
                Working days − unpaid leave − missing days (ADR-014)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Net Salary bar */}
      <div className="mt-5 flex items-center justify-between rounded-container bg-primary-tint px-5 py-4">
        <span className="text-sm font-semibold text-primary">Net Salary (Take-home)</span>
        <span className="font-display text-2xl font-bold text-primary tabular-nums">
          {formatINR(monthlyNet)}
        </span>
      </div>
    </div>
  );
}

export default SalaryBreakdown;

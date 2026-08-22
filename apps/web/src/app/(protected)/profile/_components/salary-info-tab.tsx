'use client';

import React from 'react';
import { formatINR } from '../../../../lib/format';
import type { Employee } from '../../../../lib/employees';

/**
 * Salary Info tab — **ADMIN-only** (ADR-013). Read-only component breakdown of
 * the ADR-013 Indian-payroll model: earnings (Basic, HRA, Standard Allowance,
 * Performance Bonus, LTA, Fixed Allowance) and deductions (PF employee/employer,
 * Professional Tax), with Gross / Total Deductions / Net highlighted, INR
 * formatted (ADR-008).
 *
 * The `/employees/me` payload does not (yet) carry a salary structure — that
 * lives in the payroll module (S08/S15). Until payroll data is wired here, the
 * amounts render as placeholders so the read-only structure is visible without
 * inventing an endpoint. This tab never calls payroll edit APIs (that is S15).
 */
export interface SalaryInfoTabProps {
  employee: Employee;
}

/** A component row where the amount may be unknown (renders an em dash). */
function Row({ label, amount, emphasize = false }: { label: string; amount?: number; emphasize?: boolean }) {
  return (
    <div
      className={
        emphasize
          ? 'flex items-center justify-between border-t border-border bg-background px-4 py-3 text-[13px] font-bold text-text-primary'
          : 'flex items-center justify-between border-b border-hairline px-4 py-2.5 text-[13px] text-text-primary'
      }
    >
      <span>{label}</span>
      <span className={emphasize ? 'font-extrabold' : 'font-semibold'}>
        {amount != null ? formatINR(amount) : <span className="text-text-muted">—</span>}
      </span>
    </div>
  );
}

export function SalaryInfoTab(_props: SalaryInfoTabProps) {
  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      <p className="text-[13px] text-text-secondary">
        Monthly breakdown · Read-only. Salary structure is managed in Payroll.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Earnings */}
        <div className="overflow-hidden rounded-card border border-border">
          <div className="border-b border-border bg-background px-4 py-3 text-[13px] font-bold text-text-primary">
            Earnings
          </div>
          <Row label="Basic Salary" />
          <Row label="House Rent Allowance (HRA)" />
          <Row label="Standard Allowance" />
          <Row label="Performance Bonus" />
          <Row label="Leave Travel Allowance (LTA)" />
          <Row label="Fixed Allowance" />
          <Row label="Gross Salary" emphasize />
        </div>

        {/* Deductions */}
        <div className="self-start overflow-hidden rounded-card border border-border">
          <div className="border-b border-border bg-background px-4 py-3 text-[13px] font-bold text-text-primary">
            Deductions
          </div>
          <Row label="Provident Fund (Employee 12%)" />
          <Row label="Provident Fund (Employer 12%)" />
          <Row label="Professional Tax" />
          <Row label="Total Deductions" emphasize />
        </div>
      </div>

      {/* Net highlight bar */}
      <div className="flex items-center justify-between rounded border border-primary-tint-border bg-primary-tint px-5 py-4">
        <span className="text-sm font-bold text-sidebar">Net Salary</span>
        <span className="font-display text-[22px] font-extrabold tracking-tight text-primary">—</span>
      </div>
    </div>
  );
}

export default SalaryInfoTab;

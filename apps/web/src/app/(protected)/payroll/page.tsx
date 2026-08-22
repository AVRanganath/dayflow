'use client';

import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { EmptyState } from '../../../components/ui';
import { ApiError } from '../../../lib/api/types';
import { useAuth } from '../../../lib/auth/useAuth';
import { getMyPayroll, formatPayMonth, type MyPayroll } from '../../../lib/payroll';
import { CurrentSalaryCard } from './_components/current-salary-card';
import { SalaryBreakdown } from './_components/salary-breakdown';
import { SalaryHistoryTable } from './_components/salary-history-table';
import { AdminPayrollTable } from './_components/admin-payroll-table';

/** Human label for the current month, e.g. "August 2026". */
function currentMonthLabel(): string {
  const now = new Date();
  return formatPayMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
}

/**
 * Payroll page (PAGE 10). Employees see a read-only INR salary card, ADR-013 breakdown,
 * and 12-month history. ADMIN/HR additionally see the bulk payroll surface (salary edit
 * is ADMIN-only, ADR-001). Employee data comes from `GET /payroll/me`. All amounts INR
 * (ADR-008).
 */
export default function PayrollPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isManagement = role === 'ADMIN' || role === 'HR';
  const isAdmin = role === 'ADMIN';

  const [payroll, setPayroll] = useState<MyPayroll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getMyPayroll()
      .then((data) => {
        if (!cancelled) setPayroll(data);
      })
      .catch((err) => {
        if (cancelled) return;
        // S08 not merged yet → /payroll/me 404s; show a graceful empty state.
        const message =
          err instanceof ApiError
            ? `${err.message} (payroll API — S08)`
            : err instanceof Error
              ? err.message
              : 'Failed to load payroll.';
        setError(message);
        setPayroll(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = payroll?.history?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-lg font-bold text-text-primary">Payroll</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {isManagement
            ? 'Your salary breakdown and the company payroll.'
            : 'Your salary breakdown and payslip history.'}
        </p>
      </div>

      {/* Employee (self) payroll — shown for every role. */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-card border border-border bg-card p-12 shadow-card">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : payroll ? (
        <div className="flex flex-col gap-6">
          <CurrentSalaryCard
            payroll={payroll}
            employeeId={user?.id}
            monthLabel={currentMonthLabel()}
            latest={latest}
          />
          <SalaryBreakdown
            payroll={payroll}
            payableDays={
              latest
                ? { payableDays: latest.payableDays, workingDays: latest.workingDays }
                : null
            }
          />
          <SalaryHistoryTable
            history={payroll.history}
            gross={payroll.earnings.gross}
            deductions={payroll.deductions.total}
            employeeId={user?.id}
          />
        </div>
      ) : (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="Payroll not available yet"
          description={
            error ?? 'Your salary structure has not been set up. Please check back later.'
          }
        />
      )}

      {/* Admin / HR bulk payroll surface. */}
      {isManagement && (
        <div className="mt-2 flex flex-col gap-4">
          <div className="border-t border-border pt-6">
            <h2 className="font-display text-base font-bold text-text-primary">
              Company Payroll
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {isAdmin
                ? 'Review, edit salary structures, and export payroll.'
                : 'Review company payroll and export (salary edits are Admin-only).'}
            </p>
          </div>
          <AdminPayrollTable canEdit={isAdmin} />
        </div>
      )}
    </div>
  );
}

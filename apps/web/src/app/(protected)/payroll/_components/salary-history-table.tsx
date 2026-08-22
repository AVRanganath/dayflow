'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { DataTable, StatusBadge, useToast, type Column } from '../../../../components/ui';
import { formatINR } from '../../../../lib/format';
import {
  downloadPayslip,
  triggerBlobDownload,
  formatPayMonth,
  type PayrollHistoryItem,
} from '../../../../lib/payroll';

interface SalaryHistoryTableProps {
  /** Up to the last 12 months of payroll history (from `GET /payroll/me`). */
  history: PayrollHistoryItem[];
  /** Gross figure to display per row (the current-month gross; history net is prorated). */
  gross: number;
  /** Total deductions per row (employee PF + professional tax). */
  deductions: number;
  /** Employee id used to build each row's payslip download route. */
  employeeId?: string;
}

/**
 * Last-12-months salary history table (PAGE 10): Month | Gross | Deductions | Net |
 * Status | Payslip. The payslip cell downloads that month's PDF via
 * `GET /payroll/:id/payslip`. All amounts INR (ADR-008).
 */
export function SalaryHistoryTable({
  history,
  gross,
  deductions,
  employeeId,
}: SalaryHistoryTableProps) {
  const toast = useToast();
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  const handleDownload = async (item: PayrollHistoryItem) => {
    if (!employeeId) {
      toast.error('Unable to resolve your payroll record for download.');
      return;
    }
    setDownloadingMonth(item.month);
    try {
      const [y, m] = item.month.split('-').map((p) => Number(p));
      const blob = await downloadPayslip(employeeId, y && m ? { month: m, year: y } : undefined);
      triggerBlobDownload(blob, `payslip-${item.month}.pdf`);
      toast.success('Payslip downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download payslip.');
    } finally {
      setDownloadingMonth(null);
    }
  };

  const columns: Column<PayrollHistoryItem>[] = [
    {
      key: 'month',
      header: 'Month',
      render: (item) => (
        <span className="font-medium text-text-primary">{formatPayMonth(item.month)}</span>
      ),
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: () => <span className="tabular-nums">{formatINR(gross)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: () => <span className="tabular-nums">{formatINR(deductions)}</span>,
    },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      render: (item) => (
        <span className="font-semibold tabular-nums">{formatINR(item.netSalary)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status === 'PAID' ? 'PROCESSED' : item.status} />,
    },
    {
      key: 'payslip',
      header: 'Payslip',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => handleDownload(item)}
          disabled={downloadingMonth === item.month}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-primary-tint disabled:opacity-40"
          aria-label={`Download payslip for ${formatPayMonth(item.month)}`}
        >
          {downloadingMonth === item.month ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-bold text-text-primary">Salary History</h2>
      <DataTable
        columns={columns}
        data={history}
        keyExtractor={(item) => item.month}
        emptyState={<p className="text-sm text-text-muted">No payslip history yet.</p>}
      />
    </div>
  );
}

export default SalaryHistoryTable;

'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, StatusBadge, useToast } from '../../../../components/ui';
import { formatINR } from '../../../../lib/format';
import { downloadPayslip, triggerBlobDownload, type MyPayroll } from '../../../../lib/payroll';

interface CurrentSalaryCardProps {
  /** Current-month payroll breakdown (from `GET /payroll/me`). */
  payroll: MyPayroll;
  /** Employee id used to build the payslip download route. */
  employeeId?: string;
  /** Human month label, e.g. "August 2026". */
  monthLabel: string;
  /** Latest history record (if any) — its status + month drive the badge/download. */
  latest?: { month: string; status: string; netSalary: number } | null;
}

/**
 * Large, prominent current-month salary card (PAGE 10): month/year, the Net Salary big
 * and bold in INR (ADR-008), a Processed/Pending status badge, and a Download Payslip
 * button that fetches the payslip PDF as a blob and triggers a browser download.
 */
export function CurrentSalaryCard({
  payroll,
  employeeId,
  monthLabel,
  latest,
}: CurrentSalaryCardProps) {
  const toast = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const status = latest?.status ?? 'PENDING';
  // For a processed month show the actual (prorated) net; otherwise the monthly estimate.
  const net = latest?.netSalary ?? payroll.monthlyNet;

  const handleDownload = async () => {
    if (!employeeId) {
      toast.error('Unable to resolve your payroll record for download.');
      return;
    }
    setIsDownloading(true);
    try {
      const [y, m] = (latest?.month ?? '').split('-').map((p) => Number(p));
      const blob = await downloadPayslip(
        employeeId,
        y && m ? { month: m, year: y } : undefined,
      );
      triggerBlobDownload(blob, `payslip-${latest?.month ?? 'current'}.pdf`);
      toast.success('Payslip downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download payslip.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-container border border-border shadow-hero">
      <div className="flex flex-col gap-5 bg-gradient-to-br from-[#714B67] to-[#2F1F2B] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="font-marker text-lg text-[#F0B93F]">Your payslip</p>
          <p className="mt-1 text-sm text-white/70">{monthLabel}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-display text-[38px] font-bold leading-none text-white tabular-nums">
              {formatINR(net)}
            </span>
            <StatusBadge status={status === 'PAID' ? 'PROCESSED' : status} />
          </div>
          <p className="mt-2 text-xs text-white/60">Net take-home salary</p>
        </div>

        <div className="flex-shrink-0">
          <Button
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            isLoading={isDownloading}
            onClick={handleDownload}
          >
            Download Payslip
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CurrentSalaryCard;

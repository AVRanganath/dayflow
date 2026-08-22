'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Play, Pencil, Search } from 'lucide-react';
import {
  Button,
  Input,
  DataTable,
  StatusBadge,
  Avatar,
  useToast,
  type Column,
} from '../../../../components/ui';
import { ApiError } from '../../../../lib/api/types';
import { formatINR } from '../../../../lib/format';
import {
  listPayroll,
  downloadCsv,
  formatPayMonth,
  type PayrollListRow,
  type CsvColumn,
} from '../../../../lib/payroll';
import { EditSalaryModal } from './edit-salary-modal';

interface AdminPayrollTableProps {
  /** Whether the current user is ADMIN (can edit salary structures); HR is view-only. */
  canEdit: boolean;
}

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

/**
 * ADMIN/HR bulk payroll surface (PAGE 10): employee search + bulk table (Employee |
 * Department | Gross | Deductions | Net | Status | Actions) from `GET /payroll`, a
 * Process Payroll action for the current month, and a CSV Export (differentiator #5)
 * that downloads the visible rows as `payroll.csv`. Salary-edit is ADMIN-only. All
 * amounts INR (ADR-008).
 */
export function AdminPayrollTable({ canEdit }: AdminPayrollTableProps) {
  const toast = useToast();
  const [rows, setRows] = useState<PayrollListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listPayroll({ month: CURRENT_MONTH, year: CURRENT_YEAR });
      setRows(data);
    } catch (err) {
      // S08 not merged yet → endpoint 404s. Render an empty table + a note rather than fake data.
      const message =
        err instanceof ApiError
          ? `${err.message} (payroll API — S08)`
          : err instanceof Error
            ? err.message
            : 'Failed to load payroll.';
      setLoadError(message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        (r.department ?? '').toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning('No payroll rows to export.');
      return;
    }
    const columns: CsvColumn<PayrollListRow>[] = [
      { header: 'Employee', value: (r) => r.employeeName ?? r.employeeId },
      { header: 'Department', value: (r) => r.department ?? '' },
      { header: 'Month', value: (r) => r.month },
      { header: 'Gross (INR)', value: (r) => r.gross ?? '' },
      { header: 'Deductions (INR)', value: (r) => r.deductions ?? '' },
      { header: 'Net (INR)', value: (r) => r.netSalary },
      { header: 'Payable Days', value: (r) => r.payableDays },
      { header: 'Status', value: (r) => r.status },
    ];
    downloadCsv(filtered, columns, 'payroll.csv');
    toast.success('Exported payroll.csv');
  };

  const columns: Column<PayrollListRow>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.employeeName ?? r.employeeId} size="sm" />
          <span className="font-medium text-text-primary">
            {r.employeeName ?? r.employeeId}
          </span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (r) => <span className="text-text-secondary">{r.department ?? '—'}</span>,
    },
    {
      key: 'gross',
      header: 'Gross',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums">{r.gross != null ? formatINR(r.gross) : '—'}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (r) => (
        <span className="tabular-nums">
          {r.deductions != null ? formatINR(r.deductions) : '—'}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Net',
      align: 'right',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatINR(r.netSalary)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status === 'PAID' ? 'PROCESSED' : r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (r) =>
        canEdit ? (
          <button
            onClick={() =>
              setEditing({ id: r.employeeId, name: r.employeeName ?? r.employeeId })
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-primary-tint"
            aria-label={`Edit salary structure for ${r.employeeName ?? r.employeeId}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search by employee or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2.5">
          {/* Process Payroll — no dedicated S08 endpoint; disabled + tooltip (see S15 log). */}
          <span title="Process-payroll endpoint not available in S08 yet">
            <Button variant="primary" leftIcon={<Play className="h-4 w-4" />} disabled>
              Process Payroll
            </Button>
          </span>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Payroll for {formatPayMonth(`${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}`)}
      </p>

      {loadError && (
        <p className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
          {loadError}
        </p>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => r.payrollId ?? r.employeeId}
        isLoading={isLoading}
        emptyState={
          <p className="text-sm text-text-muted">
            No payroll records for this month yet.
          </p>
        }
      />

      {canEdit && (
        <EditSalaryModal
          isOpen={editing !== null}
          onClose={() => setEditing(null)}
          employee={editing}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}

export default AdminPayrollTable;

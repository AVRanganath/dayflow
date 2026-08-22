'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LeaveStatus } from '@dayflow/shared';
import { Select, StatusBadge } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import type { MyLeaveRow } from '../../../../lib/api/leaves';

export interface LeaveHistoryTableProps {
  rows: MyLeaveRow[];
  isLoading?: boolean;
}

const PAGE_SIZE = 8;

const STATUS_FILTERS: { label: string; value: LeaveStatus | 'ALL' }[] = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/**
 * Employee leave history (PAGE 8): Leave Type badge | From | To | Days | Reason |
 * Status | Applied On. Rows expand to reveal the reviewer comment; Status + Year
 * filters and client-side pagination. Data from `GET /leaves/me`.
 */
export function LeaveHistoryTable({ rows, isLoading = false }: LeaveHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(String(new Date(r.startDate).getUTCFullYear()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const yearOptions = useMemo(
    () => [
      { label: 'All years', value: 'ALL' },
      ...years.map((y) => ({ label: y, value: y })),
    ],
    [years],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (
        yearFilter !== 'ALL' &&
        String(new Date(r.startDate).getUTCFullYear()) !== yearFilter
      ) {
        return false;
      }
      return true;
    });
  }, [rows, statusFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reviewerComment = (r: MyLeaveRow): string | null =>
    r.status === 'REJECTED'
      ? r.reviewerComment ?? 'No reason provided'
      : r.status === 'APPROVED'
        ? r.reviewerComment ?? 'Approved'
        : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-44">
          <Select
            label="Status"
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LeaveStatus | 'ALL');
              setPage(1);
            }}
          />
        </div>
        <div className="w-36">
          <Select
            label="Year"
            options={yearOptions}
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-[#F5F6F7]">
                {['', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Applied On'].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-text-muted">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const isOpen = expanded.has(r.id);
                  const comment = reviewerComment(r);
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => toggle(r.id)}
                        className="cursor-pointer bg-card transition-colors hover:bg-[#F5F6F7]"
                      >
                        <td className="px-4 py-3 text-text-muted">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.leaveType} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-text-primary">
                          {formatDate(r.startDate)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-text-primary">
                          {formatDate(r.endDate)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-text-primary">{r.totalDays}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-[13px] text-text-secondary">
                          {r.reason}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} dot />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-text-secondary">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#FAFAFB]">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex flex-col gap-1 text-[13px]">
                              <span className="text-text-secondary">
                                <span className="font-semibold text-text-primary">Reason:</span>{' '}
                                {r.reason}
                              </span>
                              {comment && (
                                <span className="text-text-secondary">
                                  <span className="font-semibold text-text-primary">
                                    Reviewer comment:
                                  </span>{' '}
                                  {comment}
                                </span>
                              )}
                              {r.attachmentUrl && (
                                <a
                                  href={r.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-fit text-secondary underline"
                                >
                                  View attachment
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px]">
            <span className="text-text-secondary">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded border border-border px-3 py-1 text-text-secondary transition-colors hover:bg-background disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded border border-border px-3 py-1 text-text-secondary transition-colors hover:bg-background disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaveHistoryTable;

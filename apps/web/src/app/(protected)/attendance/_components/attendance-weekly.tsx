'use client';

import React, { useMemo } from 'react';
import { DataTable, StatusBadge, type Column } from '../../../../components/ui';
import { formatHours } from '../../../../lib/format';
import type { MyAttendanceRow } from '../../../../lib/api/attendance';
import { formatTime } from './attendance-status';

export interface AttendanceWeeklyProps {
  rows: MyAttendanceRow[];
  isLoading?: boolean;
}

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Weekly attendance table (PAGE 7): Day | Date | Check In | Check Out | Hours Worked |
 * Status, with a totals row. Data from `GET /attendance/me?range=weekly`.
 */
export function AttendanceWeekly({ rows, isLoading = false }: AttendanceWeeklyProps) {
  const totalHours = useMemo(() => rows.reduce((sum, r) => sum + (r.hoursWorked || 0), 0), [rows]);

  const columns: Column<MyAttendanceRow>[] = [
    {
      key: 'day',
      header: 'Day',
      render: (r) => WEEKDAY_LABELS[new Date(r.date).getUTCDay()] ?? '—',
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => r.date.slice(0, 10),
    },
    {
      key: 'checkInTime',
      header: 'Check In',
      render: (r) => formatTime(r.checkInTime),
    },
    {
      key: 'checkOutTime',
      header: 'Check Out',
      render: (r) => formatTime(r.checkOutTime),
    },
    {
      key: 'hoursWorked',
      header: 'Hours Worked',
      align: 'right',
      render: (r) => (r.hoursWorked ? formatHours(r.hoursWorked) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} dot />,
    },
  ];

  return (
    <div className="flex flex-col gap-0">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyState={<p className="text-sm text-text-muted">No attendance recorded this week.</p>}
      />
      {rows.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-card border border-border bg-primary-tint px-4 py-2.5">
          <span className="text-[13px] font-semibold text-text-primary">Total this week</span>
          <span className="text-[13px] font-bold text-primary">{formatHours(totalHours)}</span>
        </div>
      )}
    </div>
  );
}

export default AttendanceWeekly;

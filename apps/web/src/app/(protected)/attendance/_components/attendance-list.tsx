'use client';

import React from 'react';
import { DataTable, type Column } from '../../../../components/ui';
import { formatHours, formatDate } from '../../../../lib/format';
import type { MyAttendanceRow } from '../../../../lib/api/attendance';
import { formatTime } from './attendance-status';

export interface AttendanceListProps {
  rows: MyAttendanceRow[];
  isLoading?: boolean;
}

/**
 * Day-wise list view (ADR-019), defaulting to the current month. Board columns:
 * Date | Check In | Check Out | Work Hours | Extra Hours | Break.
 * Data from `GET /attendance/me?range=monthly`.
 */
export function AttendanceList({ rows, isLoading = false }: AttendanceListProps) {
  const columns: Column<MyAttendanceRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => formatDate(r.date),
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
      header: 'Work Hours',
      align: 'right',
      render: (r) => (r.hoursWorked ? formatHours(r.hoursWorked) : '—'),
    },
    {
      key: 'extraHours',
      header: 'Extra Hours',
      align: 'right',
      render: (r) =>
        r.extraHours ? (
          <span className="font-medium text-secondary">{formatHours(r.extraHours)}</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'breakMinutes',
      header: 'Break',
      align: 'right',
      render: (r) => (r.breakMinutes ? formatHours(r.breakMinutes, true) : '—'),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyState={<p className="text-sm text-text-muted">No attendance recorded this month yet.</p>}
    />
  );
}

export default AttendanceList;

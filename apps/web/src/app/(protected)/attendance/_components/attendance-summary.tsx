'use client';

import React, { useMemo } from 'react';
import { formatHours } from '../../../../lib/format';
import type { MyAttendanceRow } from '../../../../lib/api/attendance';

export interface AttendanceSummaryProps {
  rows: MyAttendanceRow[];
}

interface SummaryTile {
  label: string;
  value: string;
  color: string;
}

/**
 * Summary stats bar for the employee attendance view (PAGE 7): Present / Absent /
 * Half-days / Leaves / Total Hours — derived from the current month's rows.
 */
export function AttendanceSummary({ rows }: AttendanceSummaryProps) {
  const tiles: SummaryTile[] = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leaves = 0;
    let totalHours = 0;
    for (const r of rows) {
      switch (r.status) {
        case 'PRESENT':
          present += 1;
          break;
        case 'ABSENT':
          absent += 1;
          break;
        case 'HALF_DAY':
          halfDay += 1;
          break;
        case 'ON_LEAVE':
          leaves += 1;
          break;
        default:
          break;
      }
      totalHours += r.hoursWorked || 0;
    }
    return [
      { label: 'Present Days', value: String(present), color: '#10B981' },
      { label: 'Absent', value: String(absent), color: '#EF4444' },
      { label: 'Half-days', value: String(halfDay), color: '#F59E0B' },
      { label: 'Leaves', value: String(leaves), color: '#017E84' },
      { label: 'Total Hours', value: formatHours(totalHours), color: '#714B67' },
    ];
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tile.color }} />
            <span className="text-[12px] font-medium text-text-secondary">{tile.label}</span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold text-text-primary">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}

export default AttendanceSummary;

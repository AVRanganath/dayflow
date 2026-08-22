'use client';

import React, { useMemo } from 'react';
import type { MyAttendanceRow } from '../../../../lib/api/attendance';
import {
  ATTENDANCE_STATUSES_ORDERED,
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  formatTime,
} from './attendance-status';

export interface AttendanceCalendarProps {
  rows: MyAttendanceRow[];
  isLoading?: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Monthly calendar grid (default attendance view, PAGE 7). Each day cell shows the day
 * number, a colour-coded status dot (ADR-005) and check-in/out times; a legend renders
 * below. Data comes from `GET /attendance/me?range=monthly`.
 */
export function AttendanceCalendar({ rows, isLoading = false }: AttendanceCalendarProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, MyAttendanceRow>();
    for (const row of rows) {
      // Normalise to YYYY-MM-DD regardless of whether the API sends a date or datetime.
      const key = row.date.slice(0, 10);
      map.set(key, row);
    }
    return map;
  }, [rows]);

  const { year, month, cells } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) list.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) list.push(d);
    return { year: y, month: m, cells: list };
  }, []);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-text-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[76px] rounded bg-transparent" />;
              }
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const row = byDate.get(key);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`min-h-[76px] rounded border p-1.5 ${
                    isToday
                      ? 'border-primary bg-primary-tint'
                      : 'border-hairline bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-text-primary'}`}
                    >
                      {day}
                    </span>
                    {row && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ATTENDANCE_STATUS_COLOR[row.status] }}
                        title={ATTENDANCE_STATUS_LABEL[row.status]}
                      />
                    )}
                  </div>
                  {row && (row.checkInTime || row.checkOutTime) && (
                    <div className="mt-1 space-y-0.5 text-[9px] leading-tight text-text-muted">
                      {row.checkInTime && <div>In {formatTime(row.checkInTime)}</div>}
                      {row.checkOutTime && <div>Out {formatTime(row.checkOutTime)}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-hairline pt-3">
            {ATTENDANCE_STATUSES_ORDERED.map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ATTENDANCE_STATUS_COLOR[status] }}
                />
                <span className="text-xs text-text-secondary">
                  {ATTENDANCE_STATUS_LABEL[status]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AttendanceCalendar;

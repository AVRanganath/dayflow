'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AttendanceDonutData } from '../types';

export interface AttendanceDonutProps {
  data: AttendanceDonutData;
  isLoading?: boolean;
}

const COLORS = {
  present: '#10B981',
  absent: '#EF4444',
  halfDay: '#F59E0B',
  onLeave: '#714B67',
};

/**
 * Attendance Overview Donut Chart (Recharts) per PAGE 4 and UI/README.md.
 */
export function AttendanceDonut({ data, isLoading }: AttendanceDonutProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-32 w-32 animate-pulse rounded-full border-4 border-hairline border-t-primary" />
        <span className="text-xs text-text-secondary">Loading attendance metrics...</span>
      </div>
    );
  }

  // Construct chart slices
  const chartSlices = [
    { name: 'Present', value: Math.max(data.present, 0), color: COLORS.present },
    { name: 'Absent', value: Math.max(data.absent, 0), color: COLORS.absent },
    ...(data.halfDay > 0
      ? [{ name: 'Half-day', value: data.halfDay, color: COLORS.halfDay }]
      : []),
    { name: 'On Leave', value: Math.max(data.onLeave, 0), color: COLORS.onLeave },
  ].filter((s) => s.value > 0);

  // If no data exists at all, render a default placeholder slice
  const displaySlices =
    chartSlices.length > 0
      ? chartSlices
      : [{ name: 'No data', value: 1, color: '#DEE2E6' }];

  const totalCount = data.total || 1;
  const presentPct = data.presentPercentage;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Date Subtitle */}
      <div className="mb-2">
        <p className="text-xs font-medium text-text-secondary">{data.dateSubtitle}</p>
      </div>

      {/* Donut Container with Center Label */}
      <div className="relative flex h-48 w-full items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const slice = payload[0];
                  if (!slice) return null;
                  const count = Number(slice.value) || 0;
                  const pct = Math.round((count / totalCount) * 100);
                  return (
                    <div className="rounded border border-border bg-card p-2 shadow-card text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: slice.payload.color }}
                        />
                        <span>{slice.name}</span>
                      </div>
                      <p className="mt-0.5 text-text-secondary">
                        {count} employees ({pct}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={displaySlices}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {displaySlices.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Percentage Display */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-2xl font-bold tracking-tight text-text-primary">
            {presentPct}%
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Present
          </span>
        </div>
      </div>

      {/* Two-Column Legend Strip */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: COLORS.present }}
            />
            <span className="text-text-secondary font-medium">Present</span>
          </div>
          <span className="font-semibold text-text-primary">{data.present}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: COLORS.absent }}
            />
            <span className="text-text-secondary font-medium">Absent</span>
          </div>
          <span className="font-semibold text-text-primary">{data.absent}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: COLORS.onLeave }}
            />
            <span className="text-text-secondary font-medium">On Leave</span>
          </div>
          <span className="font-semibold text-text-primary">{data.onLeave}</span>
        </div>

        {data.halfDay > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: COLORS.halfDay }}
              />
              <span className="text-text-secondary font-medium">Half-day</span>
            </div>
            <span className="font-semibold text-text-primary">{data.halfDay}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceDonut;

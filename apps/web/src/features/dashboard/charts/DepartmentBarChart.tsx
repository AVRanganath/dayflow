'use client';

import React from 'react';
import type { DepartmentHeadcountItem } from '../types';

export interface DepartmentBarChartProps {
  data: DepartmentHeadcountItem[];
  isLoading?: boolean;
}

/**
 * Department-wise Headcount horizontal bar chart per PAGE 4 and UI/README.md.
 */
export function DepartmentBarChart({ data, isLoading }: DepartmentBarChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-4 w-24 rounded bg-hairline" />
            <div className="h-3 flex-1 rounded bg-hairline" />
            <div className="h-4 w-8 rounded bg-hairline" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-text-secondary">
        No department headcount data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 py-1">
      {data.map((dept) => (
        <div key={dept.id} className="grid grid-cols-[130px_1fr_40px] items-center gap-4">
          {/* Department Name */}
          <span className="truncate text-xs font-medium text-text-primary" title={dept.name}>
            {dept.name}
          </span>

          {/* Bar Track */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.max(dept.percentage, 4)}%` }}
              role="progressbar"
              aria-valuenow={dept.count}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Headcount Number */}
          <span className="text-right text-xs font-bold text-text-primary">{dept.count}</span>
        </div>
      ))}
    </div>
  );
}

export default DepartmentBarChart;

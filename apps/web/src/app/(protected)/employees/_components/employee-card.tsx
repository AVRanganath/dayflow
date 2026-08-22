'use client';

import React from 'react';
import Link from 'next/link';
import type { WorkStatus } from '@dayflow/shared';
import { Avatar, StatusBadge } from '../../../../components/ui';
import { fullName, type Department, type Employee } from '../../../../lib/employees';

export interface EmployeeCardProps {
  employee: Employee;
  departments: Department[];
}

/** Work-status icon + accessible label (ADR-017). */
const WORK_STATUS: Record<WorkStatus, { icon: string; label: string }> = {
  PRESENT: { icon: '🟢', label: 'Present (checked in)' },
  ABSENT: { icon: '🟡', label: 'Absent' },
  ON_LEAVE: { icon: '✈️', label: 'On leave today' },
};

/**
 * Directory card (ADR-017): profile picture + basic info (name, designation,
 * department) with a live work-status icon top-right — 🟢 present, 🟡 absent,
 * ✈️ on approved leave — driven by the `workStatus` field. The whole card is
 * clickable, linking to the view-only employee page (`/employees/:id`).
 */
export function EmployeeCard({ employee, departments }: EmployeeCardProps) {
  const departmentName =
    (employee.departmentId && departments.find((d) => d.id === employee.departmentId)?.name) || null;
  const status = WORK_STATUS[employee.workStatus];

  return (
    <Link
      href={`/employees/${employee.id}`}
      className="group relative flex items-center gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <span
        className="absolute right-3 top-3 text-base leading-none"
        role="img"
        aria-label={status.label}
        title={status.label}
      >
        {status.icon}
      </span>
      <Avatar name={fullName(employee)} src={employee.profilePicture} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-text-primary">{fullName(employee)}</div>
        <div className="truncate text-xs text-text-secondary">{employee.designation ?? '—'}</div>
        <div className="mt-1.5">
          {departmentName ? (
            <StatusBadge variant="info">{departmentName}</StatusBadge>
          ) : (
            <span className="text-xs text-text-muted">{employee.employeeId}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default EmployeeCard;

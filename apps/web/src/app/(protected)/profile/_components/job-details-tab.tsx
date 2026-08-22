'use client';

import React from 'react';
import { StatusBadge } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import type { Employee } from '../../../../lib/employees';
import { ReadonlyField } from './profile-field';

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

/**
 * Job Details tab (ADR-015), **all read-only** for employees: Department,
 * Manager (reporting manager), Company, Job Position (designation), Date of
 * Joining, and working-days/week.
 *
 * Department + company names are resolved by the parent page (`/company` and
 * `/departments` are readable by any authenticated user). The reporting manager
 * is only available as `managerId` on the self payload — an employee cannot read
 * another employee record (row-level guard, ADR-001) — so we show the manager's
 * id when present.
 */
export interface JobDetailsTabProps {
  employee: Employee;
  departmentName?: string | null;
  companyName?: string | null;
}

export function JobDetailsTab({ employee, departmentName, companyName }: JobDetailsTabProps) {
  return (
    <div className="grid grid-cols-1 gap-5 px-6 py-7 sm:grid-cols-2">
      <ReadonlyField label="Department" value={departmentName} locked />
      <ReadonlyField label="Reporting Manager" value={employee.managerId} locked />
      <ReadonlyField label="Company" value={companyName} locked />
      <ReadonlyField label="Job Position" value={employee.designation} locked />
      <ReadonlyField label="Date of Joining" value={formatDate(employee.dateOfJoining)} locked />
      <ReadonlyField
        label="Working Days / Week"
        value={employee.workingDaysPerWeek != null ? String(employee.workingDaysPerWeek) : null}
        locked
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-text-primary">Employment Type</span>
        {employee.employmentType ? (
          <div>
            <StatusBadge variant="success">
              {EMPLOYMENT_LABELS[employee.employmentType] ?? employee.employmentType}
            </StatusBadge>
          </div>
        ) : (
          <div className="rounded border border-border bg-background px-3 py-2 text-sm text-text-muted">
            —
          </div>
        )}
      </div>
    </div>
  );
}

export default JobDetailsTab;

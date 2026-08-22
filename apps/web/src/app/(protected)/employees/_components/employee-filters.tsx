'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, Select } from '../../../../components/ui';
import { EMPLOYMENT_TYPES, type EmploymentType } from '@dayflow/shared';
import type { Department } from '../../../../lib/employees';

/** Active-status filter (client-side, over `user.isActive`). */
export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface EmployeeFilterValues {
  search: string;
  departmentId: string;
  employmentType: EmploymentType | '';
  status: StatusFilter;
}

export interface EmployeeFiltersProps {
  value: EmployeeFilterValues;
  departments: Department[];
  /** Fires with the debounced search + immediate filter changes. */
  onChange: (next: EmployeeFilterValues) => void;
}

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

/**
 * Directory filter bar (PAGE 6): a debounced search box plus Department /
 * Employment Type / Status selects. Search + filters drive the query and reset
 * the cursor upstream. Department + Employment Type are server-side filters;
 * Status is applied client-side over the returned rows.
 */
export function EmployeeFilters({ value, departments, onChange }: EmployeeFiltersProps) {
  const [searchInput, setSearchInput] = useState(value.search);

  // Debounce the free-text search (300ms) so we don't refetch on every keypress.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== value.search) onChange({ ...value, search: searchInput });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Keep the local input in sync when the parent resets it.
  useEffect(() => {
    setSearchInput(value.search);
  }, [value.search]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="min-w-[240px] flex-1">
        <Input
          placeholder="Search by name, ID, or department..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          aria-label="Search employees"
        />
      </div>

      <Select
        aria-label="Filter by department"
        className="sm:w-44"
        value={value.departmentId}
        onChange={(e) => onChange({ ...value, departmentId: e.target.value })}
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by employment type"
        className="sm:w-40"
        value={value.employmentType}
        onChange={(e) =>
          onChange({ ...value, employmentType: e.target.value as EmploymentType | '' })
        }
      >
        <option value="">All Types</option>
        {EMPLOYMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {EMPLOYMENT_LABELS[t]}
          </option>
        ))}
      </Select>

      <Select
        aria-label="Filter by status"
        className="sm:w-36"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as StatusFilter })}
      >
        <option value="ALL">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </Select>
    </div>
  );
}

export default EmployeeFilters;

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, MoreVertical } from 'lucide-react';
import { Avatar, DataTable, StatusBadge, type Column } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { fullName, type Department, type Employee } from '../../../../lib/employees';

export interface EmployeeTableProps {
  employees: Employee[];
  departments: Department[];
  isLoading?: boolean;
}

/**
 * Directory table (PAGE 6). Columns: Employee (avatar + bold name + gray email),
 * ID, Department (badge), Designation, Join Date, Status (Active green /
 * Inactive red), Actions (View / Edit / three-dot). Zebra striping via the
 * shared DataTable; rows come from `GET /employees`. Clicking a row (or the View
 * action) opens the view-only employee page.
 */
export function EmployeeTable({ employees, departments, isLoading }: EmployeeTableProps) {
  const router = useRouter();
  const deptName = (id: string | null) =>
    (id && departments.find((d) => d.id === id)?.name) || null;

  const view = (id: string) => router.push(`/employees/${id}`);

  const columns: Column<Employee>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (e) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={fullName(e)} src={e.profilePicture} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-text-primary">{fullName(e)}</div>
            <div className="truncate text-xs text-text-secondary">{e.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeId',
      header: 'ID',
      render: (e) => <span className="text-text-secondary">{e.employeeId}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (e) => {
        const name = deptName(e.departmentId);
        return name ? <StatusBadge variant="info">{name}</StatusBadge> : <span className="text-text-muted">—</span>;
      },
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (e) => e.designation ?? <span className="text-text-muted">—</span>,
    },
    {
      key: 'dateOfJoining',
      header: 'Join Date',
      render: (e) => <span className="text-text-secondary">{formatDate(e.dateOfJoining)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <StatusBadge variant={e.user.isActive ? 'success' : 'danger'}>
          {e.user.isActive ? 'Active' : 'Inactive'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          <ActionButton label="View" onClick={() => view(e.id)}>
            <Eye className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton label="Edit" onClick={() => view(e.id)}>
            <Pencil className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton label="More">
            <MoreVertical className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      ),
    },
  ];

  return (
    <DataTable<Employee>
      columns={columns}
      data={employees}
      keyExtractor={(e) => e.id}
      isLoading={isLoading}
      onRowClick={(e) => view(e.id)}
      emptyState={<p className="text-sm text-text-muted">No employees match your filters.</p>}
    />
  );
}

/** A small square icon action button; stops row-click propagation. */
function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-text-secondary transition-colors hover:bg-hairline"
    >
      {children}
    </button>
  );
}

export default EmployeeTable;

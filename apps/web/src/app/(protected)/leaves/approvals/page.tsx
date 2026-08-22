'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { LeaveType } from '@dayflow/shared';
import { Button, Select, StatsCard, useToast } from '../../../../components/ui';
import { useAuth } from '../../../../lib/auth/useAuth';
import {
  approveLeave,
  getAllLeaves,
  getDepartments,
  getEmployeeOptions,
  rejectLeave,
  type AdminLeaveRow,
  type DepartmentOption,
  type EmployeeOption,
} from '../../../../lib/api/leaves';
import { ApiError } from '../../../../lib/api/types';
import { LeaveRequestCard } from './_components/leave-request-card';
import { AllocationModal } from './_components/allocation-modal';
import { ApprovalsEmptyState } from './_components/empty-state';

type SortKey = 'date' | 'name';

/**
 * Leave Approvals page (PAGE 9) — ADMIN/HR only. Employees are redirected to
 * `/dashboard`. Shows a stats bar, filter/sort bar, and pending request cards with
 * Approve/Reject, plus an Allocate Leave action (ADR-018). Data from `GET /leaves`.
 */
export default function LeaveApprovalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'HR';

  const [requests, setRequests] = useState<AdminLeaveRow[]>([]);
  const [allThisMonth, setAllThisMonth] = useState<AdminLeaveRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allocOpen, setAllocOpen] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  // Redirect employees away from this admin-only route (ADR-001).
  useEffect(() => {
    if (!authLoading && !isAdminOrHr) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAdminOrHr, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pending, approved, rejected] = await Promise.all([
        getAllLeaves('PENDING'),
        getAllLeaves('APPROVED'),
        getAllLeaves('REJECTED'),
      ]);
      setRequests(pending.data);
      setAllThisMonth([...approved.data, ...rejected.data]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load leave requests';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAdminOrHr) return;
    void load();
    getDepartments()
      .then(setDepartments)
      .catch(() => {
        /* department filter is optional */
      });
    getEmployeeOptions()
      .then(setEmployees)
      .catch(() => {
        /* employee→department mapping is optional */
      });
  }, [isAdminOrHr, load]);

  // Maps employeeId → departmentId / name (leave rows carry only the employee name).
  const employeeDeptMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const e of employees) map.set(e.id, e.departmentId);
    return map;
  }, [employees]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return map;
  }, [departments]);

  const monthlyCounts = useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const inThisMonth = (iso: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getUTCFullYear() === y && d.getUTCMonth() === m;
    };
    let approved = 0;
    let rejected = 0;
    for (const r of allThisMonth) {
      if (!inThisMonth(r.reviewedAt)) continue;
      if (r.status === 'APPROVED') approved += 1;
      else if (r.status === 'REJECTED') rejected += 1;
    }
    return { approved, rejected };
  }, [allThisMonth]);

  const visibleRequests = useMemo(() => {
    let list = [...requests];
    if (departmentFilter !== 'ALL') {
      list = list.filter((r) => employeeDeptMap.get(r.employeeId) === departmentFilter);
    }
    if (typeFilter !== 'ALL') {
      list = list.filter((r) => r.leaveType === typeFilter);
    }
    list.sort((a, b) => {
      if (sortKey === 'name') {
        return `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
          `${b.employee.firstName} ${b.employee.lastName}`,
        );
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return list;
  }, [requests, departmentFilter, typeFilter, sortKey]);

  const handleApprove = useCallback(
    async (id: string, notes?: string) => {
      try {
        await approveLeave(id, notes);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        toast.success('Leave approved');
        void load();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Approve failed';
        toast.error(message);
      }
    },
    [toast, load],
  );

  const handleReject = useCallback(
    async (id: string, reason: string) => {
      try {
        await rejectLeave(id, reason);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        toast.success('Leave rejected');
        void load();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Reject failed';
        toast.error(message);
      }
    },
    [toast, load],
  );

  if (authLoading || !isAdminOrHr) {
    return null;
  }

  const departmentOptions = [
    { label: 'All departments', value: 'ALL' },
    ...departments.map((d) => ({ label: d.name, value: d.id })),
  ];

  const typeOptions: { label: string; value: LeaveType | 'ALL' }[] = [
    { label: 'All types', value: 'ALL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Sick', value: 'SICK' },
    { label: 'Casual', value: 'CASUAL' },
    { label: 'Unpaid', value: 'UNPAID' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Leave Approvals</h1>
          <p className="text-sm text-text-secondary">Review and act on pending leave requests.</p>
        </div>
        <Button
          size="lg"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setAllocOpen(true)}
        >
          Allocate Leave
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Pending" value={requests.length} tileColor="amber" />
        <StatsCard label="Approved this month" value={monthlyCounts.approved} tileColor="green" />
        <StatsCard label="Rejected this month" value={monthlyCounts.rejected} tileColor="plum" />
      </div>

      {/* Filter / sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-52">
          <Select
            label="Department"
            options={departmentOptions}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            label="Leave Type"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LeaveType | 'ALL')}
          />
        </div>
        <div className="w-48">
          <Select
            label="Sort by"
            options={[
              { label: 'Date Applied', value: 'date' },
              { label: 'Employee Name', value: 'name' },
            ]}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          />
        </div>
      </div>

      {/* Request cards */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : visibleRequests.length === 0 ? (
        <ApprovalsEmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {visibleRequests.map((req) => {
            const deptId = employeeDeptMap.get(req.employeeId);
            const deptName = deptId ? (departmentNameById.get(deptId) ?? null) : null;
            return (
              <LeaveRequestCard
                key={req.id}
                request={req}
                departmentName={deptName}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            );
          })}
        </div>
      )}

      <AllocationModal isOpen={allocOpen} onClose={() => setAllocOpen(false)} onAllocated={load} />
    </div>
  );
}

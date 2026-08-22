'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Avatar, Button, StatusBadge } from '../../../../components/ui';
import type { WorkStatus } from '@dayflow/shared';
import { api } from '../../../../lib/api/client';
import { API_ROUTES } from '@dayflow/shared';
import { ApiError } from '../../../../lib/api/types';
import { useAuth } from '../../../../lib/auth/useAuth';
import { formatDate } from '../../../../lib/format';
import {
  getEmployee,
  listDepartments,
  fullName,
  type Department,
  type Employee,
} from '../../../../lib/employees';
import { ReadonlyField } from '../../profile/_components/profile-field';
import { JobDetailsTab } from '../../profile/_components/job-details-tab';
import { SalaryInfoTab } from '../../profile/_components/salary-info-tab';

interface Company {
  id: string;
  name: string;
}

type TabKey = 'private' | 'job' | 'salary';

const GENDER_LABELS: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  OTHER: 'Other',
};
const WORK_STATUS: Record<WorkStatus, { icon: string; label: string }> = {
  PRESENT: { icon: '🟢', label: 'Present' },
  ABSENT: { icon: '🟡', label: 'Absent' },
  ON_LEAVE: { icon: '✈️', label: 'On leave' },
};

/**
 * View-only employee page (`/employees/:id`) — a read-only reuse of the profile
 * view with **no edit controls**. Reached by clicking a directory row/card
 * (ADR-017). ADMIN/HR only (the server enforces row-level access; employees are
 * bounced to `/dashboard`).
 */
export default function EmployeeViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const isManagement = user?.role === 'ADMIN' || user?.role === 'HR';
  const isAdmin = user?.role === 'ADMIN';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('private');

  useEffect(() => {
    if (!authLoading && user && !isManagement) router.replace('/dashboard');
  }, [authLoading, user, isManagement, router]);

  useEffect(() => {
    if (!isManagement || !id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const emp = await getEmployee(id);
        if (!mounted) return;
        setEmployee(emp);
        const [depts, comp] = await Promise.allSettled([
          listDepartments(),
          api.get<Company>(API_ROUTES.company.base),
        ]);
        if (!mounted) return;
        if (depts.status === 'fulfilled') setDepartments(depts.value);
        if (comp.status === 'fulfilled') setCompany(comp.value);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : 'Could not load this employee');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isManagement, id]);

  const departmentName = useMemo(() => {
    if (!employee?.departmentId) return null;
    return departments.find((d) => d.id === employee.departmentId)?.name ?? null;
  }, [departments, employee]);

  const tabs = useMemo(() => {
    const base: { key: TabKey; label: string }[] = [
      { key: 'private', label: 'Private Info' },
      { key: 'job', label: 'Job Details' },
    ];
    if (isAdmin) base.push({ key: 'salary', label: 'Salary Info' });
    return base;
  }, [isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <div className="rounded-card border border-border bg-card p-8 text-center shadow-card">
          <h3 className="text-lg font-bold text-text-primary">Unable to load employee</h3>
          <p className="mt-1 text-sm text-text-secondary">{error ?? 'Employee not found.'}</p>
        </div>
      </div>
    );
  }

  const status = WORK_STATUS[employee.workStatus];

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        className="self-start"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push('/employees')}
      >
        Back to Directory
      </Button>

      {/* Header (read-only, no upload/edit controls) */}
      <div className="flex flex-col items-start gap-7 rounded-container border border-border bg-card p-7 shadow-card sm:flex-row sm:items-center">
        <div className="relative flex-shrink-0">
          <Avatar
            name={fullName(employee)}
            src={employee.profilePicture}
            size="xl"
            className="h-[120px] w-[120px] text-4xl"
          />
          <span
            className="absolute right-1 top-1 text-lg leading-none"
            role="img"
            aria-label={status.label}
            title={status.label}
          >
            {status.icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-bold text-text-primary">
            {fullName(employee)}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">{employee.designation ?? '—'}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {departmentName && <StatusBadge variant="info">{departmentName}</StatusBadge>}
            <StatusBadge variant={employee.user.isActive ? 'success' : 'danger'}>
              {employee.user.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
            <span className="text-xs font-medium text-text-secondary">
              Employee ID: {employee.employeeId}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs (read-only) */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex gap-1 border-b border-border px-4">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={
                  isActive
                    ? 'border-b-2 border-primary px-4 py-3.5 text-sm font-semibold text-primary'
                    : 'border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-text-secondary hover:text-text-primary'
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'private' && (
          <div className="flex flex-col gap-6 px-6 py-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadonlyField label="Personal Email" value={employee.personalEmail} />
              <ReadonlyField label="Phone" value={employee.phone} />
              <ReadonlyField label="Residing Address" value={employee.address} full />
              <ReadonlyField label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
              <ReadonlyField
                label="Gender"
                value={employee.gender ? GENDER_LABELS[employee.gender] : null}
              />
              <ReadonlyField label="Nationality" value={employee.nationality} />
              <ReadonlyField
                label="Marital Status"
                value={employee.maritalStatus ? MARITAL_LABELS[employee.maritalStatus] : null}
              />
              <ReadonlyField label="PAN No" value={employee.panNumber} />
              <ReadonlyField label="UAN No" value={employee.uanNumber} />
              <ReadonlyField label="Emp Code" value={employee.employeeCode} />
            </div>
            <div className="border-t border-hairline pt-6">
              <h4 className="mb-4 font-display text-sm font-bold text-text-primary">
                Bank Details
              </h4>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <ReadonlyField label="Account Number" value={employee.bankAccountNumber} />
                <ReadonlyField label="Bank Name" value={employee.bankName} />
                <ReadonlyField label="IFSC" value={employee.bankIfsc} />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'job' && (
          <JobDetailsTab
            employee={employee}
            departmentName={departmentName}
            companyName={company?.name}
          />
        )}
        {activeTab === 'salary' && isAdmin && <SalaryInfoTab employee={employee} />}
      </div>
    </div>
  );
}

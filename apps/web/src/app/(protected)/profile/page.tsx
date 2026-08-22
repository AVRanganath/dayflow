'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../lib/api/client';
import { API_ROUTES } from '@dayflow/shared';
import { ApiError } from '../../../lib/api/types';
import { useAuth } from '../../../lib/auth/useAuth';
import {
  getMe,
  listDepartments,
  fullName,
  type Department,
  type Employee,
} from '../../../lib/employees';
import { AvatarUpload } from './_components/avatar-upload';
import { ResumeTab } from './_components/resume-tab';
import { PrivateInfoTab } from './_components/private-info-tab';
import { JobDetailsTab } from './_components/job-details-tab';
import { SalaryInfoTab } from './_components/salary-info-tab';

type TabKey = 'resume' | 'private' | 'job' | 'salary';

interface Company {
  id: string;
  name: string;
}

/**
 * PAGE 5 — Employee Profile (view + limited edit). Loads `GET /employees/me`
 * (role-agnostic) and renders the header (120px avatar w/ camera upload, name,
 * designation, department badge, Employee ID, "Edit Profile") plus the ADR-015
 * board tabs — Resume, Private Info, Job Details, and (ADMIN only, ADR-013)
 * Salary Info.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('resume');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getMe();
        if (!mounted) return;
        setEmployee(me);
        // Best-effort lookups for the Job Details tab (any authed user may read).
        const [depts, comp] = await Promise.allSettled([
          listDepartments(),
          api.get<Company>(API_ROUTES.company.base),
        ]);
        if (!mounted) return;
        if (depts.status === 'fulfilled') setDepartments(depts.value);
        if (comp.status === 'fulfilled') setCompany(comp.value);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : 'Could not load your profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const departmentName = useMemo(() => {
    if (!employee?.departmentId) return null;
    return departments.find((d) => d.id === employee.departmentId)?.name ?? null;
  }, [departments, employee]);

  const handleSaved = useCallback((updated: Employee) => setEmployee(updated), []);
  const handleUploaded = useCallback(
    (url: string) => setEmployee((prev) => (prev ? { ...prev, profilePicture: url } : prev)),
    [],
  );

  const tabs = useMemo(() => {
    const base: { key: TabKey; label: string }[] = [
      { key: 'resume', label: 'Resume' },
      { key: 'private', label: 'Private Info' },
      { key: 'job', label: 'Job Details' },
    ];
    if (isAdmin) base.push({ key: 'salary', label: 'Salary Info' });
    return base;
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center shadow-card">
        <h3 className="text-lg font-bold text-text-primary">Unable to load profile</h3>
        <p className="mt-1 text-sm text-text-secondary">{error ?? 'No profile found.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <div className="flex flex-col items-start gap-7 rounded-container border border-border bg-card p-7 shadow-card sm:flex-row sm:items-center">
        <AvatarUpload
          employeeId={employee.id}
          name={fullName(employee)}
          src={employee.profilePicture}
          onUploaded={handleUploaded}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-bold text-text-primary">{fullName(employee)}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{employee.designation ?? '—'}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            {departmentName && <StatusBadge variant="info">{departmentName}</StatusBadge>}
            <span className="text-xs font-medium text-text-secondary">
              Employee ID: {employee.employeeId}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          leftIcon={<Pencil className="h-4 w-4" />}
          onClick={() => setActiveTab('private')}
        >
          Edit Profile
        </Button>
      </div>

      {/* Tabs */}
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

        {activeTab === 'resume' && <ResumeTab employee={employee} onSaved={handleSaved} />}
        {activeTab === 'private' && <PrivateInfoTab employee={employee} onSaved={handleSaved} />}
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

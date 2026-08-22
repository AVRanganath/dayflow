'use client';

import React from 'react';
import { useAuth } from '../../../lib/auth/useAuth';
import { EmployeeDashboard, AdminDashboard } from '../../../features/dashboard';

/**
 * Main Role-Switched Dashboard Page (Session S12).
 * Renders EmployeeDashboard for EMPLOYEE, or AdminDashboard for ADMIN / HR.
 */
export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-medium text-text-secondary">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const role = user?.role || 'EMPLOYEE';
  const isAdminOrHr = role === 'ADMIN' || role === 'HR';

  return <div className="w-full">{isAdminOrHr ? <AdminDashboard /> : <EmployeeDashboard />}</div>;
}

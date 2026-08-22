'use client';

import React from 'react';
import { Users, CalendarCheck, Clock, IndianRupee } from 'lucide-react';
import { Button, StatsCard, StatusBadge, ProgressBar } from '../../../components/ui';
import { useAuth } from '../../../lib/auth/useAuth';
import { formatINR } from '../../../lib/format';

export default function DashboardPlaceholderPage() {
  const { user } = useAuth();
  const userName = user?.firstName || 'Team Member';

  return (
    <div className="flex flex-col gap-6">
      {/* Design System Token Verification Strip */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">
              Welcome back, {userName}!
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Dayflow Web Foundation (Session S10) active.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm">
              Documentation
            </Button>
            <Button variant="primary" size="sm">
              Foundation Ready
            </Button>
          </div>
        </div>
      </div>

      {/* Spot Check UI Primitives */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Employees"
          value="148"
          tileColor="teal"
          icon={<Users className="h-4 w-4" />}
          delta={{ text: '↑ +3 this month', isPositive: true }}
        />
        <StatsCard
          label="Present Today"
          value="132"
          tileColor="green"
          icon={<CalendarCheck className="h-4 w-4" />}
          delta={{ text: '89% attendance', variant: 'success' }}
        />
        <StatsCard
          label="Pending Leaves"
          value="7"
          tileColor="amber"
          icon={<Clock className="h-4 w-4" />}
          delta={{ text: 'needs review', variant: 'warning' }}
        />
        <StatsCard
          label="Payroll Estimate"
          value={formatINR(4250000)}
          tileColor="plum"
          icon={<IndianRupee className="h-4 w-4" />}
          delta={{ text: 'Aug 2026', variant: 'neutral' }}
        />
      </div>

      {/* Primitive Showcase Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5 shadow-card flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-text-primary">Status Badges</h3>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="APPROVED" />
            <StatusBadge status="PENDING" />
            <StatusBadge status="REJECTED" />
            <StatusBadge status="PRESENT" dot />
            <StatusBadge status="ON_LEAVE" dot />
            <StatusBadge status="PAID" />
          </div>
        </div>

        <div className="rounded-card border border-border bg-card p-5 shadow-card flex flex-col gap-4">
          <h3 className="font-display text-sm font-bold text-text-primary">Progress Bars</h3>
          <div className="flex flex-col gap-3">
            <ProgressBar value={8} max={12} color="primary" label="Paid Leave Balance" showValue />
            <ProgressBar value={3} max={5} color="warning" label="Sick Leave Balance" showValue />
          </div>
        </div>
      </div>
    </div>
  );
}

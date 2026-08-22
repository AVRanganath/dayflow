'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CalendarCheck, Clock, IndianRupee, Check, X, ArrowRight } from 'lucide-react';
import { StatsCard, StatusBadge, Avatar, Button, Modal, Textarea } from '../../components/ui';
import { AttendanceDonut } from './charts/AttendanceDonut';
import { DepartmentBarChart } from './charts/DepartmentBarChart';
import { useAdminDashboard } from './hooks';
import { formatINR } from '../../lib/format';
import type { AdminLeaveRequestRow } from './types';

/**
 * Admin Dashboard (PAGE 4 of UI Design Spec).
 * Features 4 StatsCards with live salary-engine totals (ADR-013/014),
 * Recent Leave Requests table with inline Approve/Reject actions (ADR-006)
 * and ADR-017 work status indicators (🟢/🟡/✈️), Attendance Donut chart,
 * and Department Headcount bar chart.
 */
export function AdminDashboard() {
  const router = useRouter();
  const {
    isLoading,
    isProcessingAction,
    summaryStats,
    donutData,
    leaveRequests,
    departmentHeadcount,
    approveLeave,
    rejectLeave,
  } = useAdminDashboard();

  // Reject reason dialog state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<AdminLeaveRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const openRejectModal = (item: AdminLeaveRequestRow) => {
    setRejectingItem(item);
    setRejectReason('');
    setRejectError(null);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    if (rejectReason.trim().length < 5) {
      setRejectError('Rejection reason must be at least 5 characters long.');
      return;
    }

    await rejectLeave(rejectingItem.id, rejectReason.trim());
    setRejectModalOpen(false);
    setRejectingItem(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — 4 StatsCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Employees"
          value={String(summaryStats.totalEmployees)}
          tileColor="teal"
          icon={<Users className="h-4 w-4" />}
          delta={{ text: 'Live headcount', variant: 'neutral' }}
        />
        <StatsCard
          label="Present Today"
          value={String(summaryStats.presentToday)}
          tileColor="green"
          icon={<CalendarCheck className="h-4 w-4" />}
          delta={{ text: `${summaryStats.presentPercentage}% attendance`, variant: 'success' }}
        />
        <div
          onClick={() => router.push('/leaves/approvals')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/leaves/approvals');
          }}
        >
          <StatsCard
            label="Pending Leave Requests"
            value={String(summaryStats.pendingLeaves)}
            tileColor="amber"
            icon={<Clock className="h-4 w-4" />}
            delta={{ text: 'needs review →', variant: 'warning' }}
          />
        </div>
        <div
          onClick={() => router.push('/payroll')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/payroll');
          }}
        >
          <StatsCard
            label="Total Payroll This Month"
            value={formatINR(summaryStats.monthlyPayrollTotal)}
            tileColor="plum"
            icon={<IndianRupee className="h-4 w-4" />}
            delta={{ text: 'salary engine', variant: 'neutral' }}
          />
        </div>
      </div>

      {/* Row 2 — Left (60%): Recent Leave Requests Table, Right (40%): Attendance Overview Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Leave Requests Table (lg:col-span-7) */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-5 sm:p-6 shadow-card lg:col-span-7">
          <div>
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h2 className="font-display text-[15px] font-bold text-text-primary">
                  Recent Leave Requests
                </h2>
                <p className="text-xs text-text-secondary">
                  {summaryStats.pendingLeaves} pending approvals
                </p>
              </div>
              <button
                onClick={() => router.push('/leaves/approvals')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Leave Requests List */}
            <div className="mt-2 divide-y divide-hairline">
              {isLoading ? (
                <div className="flex flex-col gap-4 py-4 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 w-full rounded bg-hairline" />
                  ))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  No leave requests to review.
                </div>
              ) : (
                leaveRequests.slice(0, 5).map((req) => {
                  const isPending = req.status === 'PENDING';
                  const isActing = isProcessingAction === req.id;

                  return (
                    <div
                      key={req.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between text-xs"
                    >
                      {/* Employee Avatar + Work Status Indicator + Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={req.employeeName}
                          src={req.employeeAvatar}
                          size="sm"
                          workStatus={req.workStatus}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text-primary">
                            {req.employeeName}
                          </p>
                          <p className="text-[11px] text-text-secondary">{req.dateRange}</p>
                        </div>
                      </div>

                      {/* Leave Type & Status & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <StatusBadge status={req.leaveType} />
                        <StatusBadge status={req.status} />

                        {/* Inline Actions for Pending Requests */}
                        {isPending ? (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              disabled={isActing}
                              onClick={() => approveLeave(req.id)}
                              title="Approve Leave"
                              className="flex h-7 w-7 items-center justify-center rounded border border-[#D1FAE5] bg-[#ECFDF5] text-success hover:bg-[#D1FAE5] transition-colors disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => openRejectModal(req)}
                              title="Reject Leave"
                              className="flex h-7 w-7 items-center justify-center rounded border border-[#FECACA] bg-[#FEF2F2] text-danger hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-hairline pt-3 text-[11px] text-text-muted flex items-center justify-between">
            <span>Live status indicators: 🟢 Present · 🟡 Absent · ✈️ On Leave</span>
          </div>
        </div>

        {/* Right Column: Attendance Overview Donut (lg:col-span-5) */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-5 sm:p-6 shadow-card lg:col-span-5">
          <div>
            <h2 className="font-display text-[15px] font-bold text-text-primary">
              Attendance Overview
            </h2>
            <div className="mt-2">
              <AttendanceDonut data={donutData} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 — Department-wise Headcount Bar Chart */}
      <div className="rounded-card border border-border bg-card p-5 sm:p-6 shadow-card">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <h2 className="font-display text-[15px] font-bold text-text-primary">
            Department-wise Headcount
          </h2>
          <span className="text-xs text-text-secondary">
            {departmentHeadcount.reduce((acc, d) => acc + d.count, 0)} Total Assigned
          </span>
        </div>
        <div className="mt-4">
          <DepartmentBarChart data={departmentHeadcount} isLoading={isLoading} />
        </div>
      </div>

      {/* Reject Leave Request Modal (ADR-006 Reason Capture) */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Leave Request"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">
            Please specify a reason for rejecting the leave request for{' '}
            <strong className="text-text-primary">{rejectingItem?.employeeName}</strong>.
          </p>

          <Textarea
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (rejectError) setRejectError(null);
            }}
            placeholder="e.g. Insufficient coverage during sprint release..."
            error={rejectError || undefined}
            rows={3}
            required
          />

          <div className="mt-2 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isProcessingAction === rejectingItem?.id}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminDashboard;

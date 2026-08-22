'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, PlusCircle, ArrowRight } from 'lucide-react';
import { Button, ProgressBar, StatusBadge } from '../../components/ui';
import { useEmployeeDashboard } from './hooks';
import { clsx } from 'clsx';

/**
 * Employee Dashboard (PAGE 3 of UI Design Spec).
 * Features Today's Attendance with live Check In/Out mutation,
 * Allocation-based Leave Balances (ADR-018), Recent Activity,
 * This Week's Summary grid, and bottom Stats Strip.
 */
export function EmployeeDashboard() {
  const router = useRouter();
  const {
    isLoading,
    isMutating,
    todayAttendance,
    leaveBalances,
    weeklySummary,
    activityFeed,
    statsStrip,
    checkIn,
    checkOut,
  } = useEmployeeDashboard();

  return (
    <div className="flex flex-col gap-6">
      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1. Today's Attendance Card */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-6 shadow-card">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold text-text-primary">
                Today&apos;s Attendance
              </h2>
              {todayAttendance.isCheckedIn ? (
                <StatusBadge status="PRESENT" dot />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#EDEFF1] px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-text-muted" />
                  Not Checked In
                </span>
              )}
            </div>

            {/* Check-in Time & Hours Worked */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-text-secondary">Check-in Time</span>
                <span className="font-display text-2xl font-bold text-text-primary">
                  {todayAttendance.checkInTime || '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-text-secondary">Hours Worked</span>
                <span className="font-display text-2xl font-bold text-text-primary">
                  {todayAttendance.hoursWorkedFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-4 border-t border-hairline">
            {todayAttendance.isCheckedIn ? (
              <Button
                variant="danger"
                size="lg"
                isLoading={isMutating}
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={() => checkOut(0)}
                className="w-full bg-danger hover:bg-danger-hover text-white font-semibold py-3"
              >
                Check Out
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                isLoading={isMutating}
                leftIcon={<LogIn className="h-4 w-4" />}
                onClick={checkIn}
                className="w-full bg-success hover:bg-[#0DA271] text-white font-semibold py-3 border-transparent"
              >
                Check In
              </Button>
            )}
          </div>
        </div>

        {/* 2. Leave Balance Card (ADR-018) */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-6 shadow-card">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold text-text-primary">
                Leave Balance
              </h2>
              <span className="text-xs text-text-secondary">Year {new Date().getFullYear()}</span>
            </div>

            <div className="mt-4 flex flex-col gap-3.5">
              <ProgressBar
                label="Paid Leave"
                value={leaveBalances.paid.remaining}
                max={leaveBalances.paid.allocated}
                color="primary"
                showValue
              />
              <ProgressBar
                label="Sick Leave"
                value={leaveBalances.sick.remaining}
                max={leaveBalances.sick.allocated}
                color="warning"
                showValue
              />
              <ProgressBar
                label="Casual Leave"
                value={leaveBalances.casual.remaining}
                max={leaveBalances.casual.allocated}
                color="success"
                showValue
              />
            </div>
          </div>

          {/* Apply Leave CTA */}
          <div className="mt-6 pt-4 border-t border-hairline">
            <Button
              variant="outline"
              size="md"
              leftIcon={<PlusCircle className="h-4 w-4 text-primary" />}
              onClick={() => router.push('/leaves')}
              className="w-full border-primary text-primary hover:bg-primary-tint font-medium"
            >
              Apply for Leave
            </Button>
          </div>
        </div>

        {/* 3. Recent Activity Card */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="font-display text-[15px] font-bold text-text-primary">
              Recent Activity
            </h2>
            <div className="mt-4 flex flex-col gap-3.5">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 w-full rounded bg-hairline" />
                  ))}
                </div>
              ) : activityFeed.length === 0 ? (
                <p className="text-xs text-text-secondary">No recent activities found.</p>
              ) : (
                activityFeed.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={clsx(
                          'h-2 w-2 flex-shrink-0 rounded-full',
                          item.dotColor === 'green' && 'bg-success',
                          item.dotColor === 'plum' && 'bg-primary',
                          item.dotColor === 'amber' && 'bg-warning',
                          item.dotColor === 'gray' && 'bg-text-muted',
                        )}
                      />
                      <span className="truncate text-text-primary font-medium">{item.title}</span>
                    </div>
                    <span className="flex-shrink-0 text-text-secondary">{item.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-hairline flex justify-end">
            <button
              onClick={() => router.push('/attendance')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              <span>View full history</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4. This Week's Summary Card */}
        <div className="flex flex-col justify-between rounded-card border border-border bg-card p-6 shadow-card">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold text-text-primary">
                This Week&apos;s Summary
              </h2>
              <span className="text-xs font-semibold text-success">
                {weeklySummary.attendanceRate}% Attendance
              </span>
            </div>

            {/* Mon-Fri Grid */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {weeklySummary.days.map((day) => {
                const isPresent = day.status === 'PRESENT';
                const isHalfDay = day.status === 'HALF_DAY';
                const isOnLeave = day.status === 'ON_LEAVE';
                const isAbsent = day.status === 'ABSENT';

                return (
                  <div
                    key={day.dayName}
                    className={clsx(
                      'flex flex-col items-center justify-center rounded border p-2 text-center transition-colors',
                      day.isToday ? 'border-primary bg-primary-tint/30' : 'border-border bg-zebra',
                    )}
                  >
                    <span className="text-[11px] font-semibold text-text-secondary">
                      {day.dayName}
                    </span>
                    <span
                      className={clsx(
                        'my-1.5 h-2.5 w-2.5 rounded-full',
                        isPresent && 'bg-success',
                        isHalfDay && 'bg-warning',
                        isOnLeave && 'bg-primary',
                        isAbsent && 'bg-danger',
                      )}
                      title={day.status}
                    />
                    <span className="text-[10px] text-text-muted">{day.hoursFormatted}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Weekly Hours Metric */}
          <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
            <span className="text-xs text-text-secondary font-medium">Total Weekly Hours</span>
            <span className="font-display text-base font-bold text-text-primary">
              {weeklySummary.totalHoursFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Quick-Stats Strip */}
      <div className="rounded-card border border-border bg-card p-4 sm:p-5 shadow-card">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-border text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-text-secondary">Total Working Days</span>
            <span className="mt-1 font-display text-xl font-bold text-text-primary">
              {statsStrip.totalWorkingDays}
            </span>
          </div>
          <div className="flex flex-col items-center sm:pl-4">
            <span className="text-xs font-medium text-text-secondary">Present</span>
            <span className="mt-1 font-display text-xl font-bold text-success">
              {statsStrip.present}
            </span>
          </div>
          <div className="flex flex-col items-center sm:pl-4">
            <span className="text-xs font-medium text-text-secondary">Absent</span>
            <span className="mt-1 font-display text-xl font-bold text-danger">
              {statsStrip.absent}
            </span>
          </div>
          <div className="flex flex-col items-center sm:pl-4">
            <span className="text-xs font-medium text-text-secondary">On Leave</span>
            <span className="mt-1 font-display text-xl font-bold text-primary">
              {statsStrip.leave}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;

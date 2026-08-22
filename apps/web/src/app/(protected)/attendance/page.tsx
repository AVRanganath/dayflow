'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import type { AttendanceRange } from '@dayflow/shared';
import { Button, ProgressBar, useToast } from '../../../components/ui';
import { useAuth } from '../../../lib/auth/useAuth';
import { formatDate, formatHours } from '../../../lib/format';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  type MyAttendanceRow,
} from '../../../lib/api/attendance';
import { ApiError } from '../../../lib/api/types';
import { AttendanceCalendar } from './_components/attendance-calendar';
import { AttendanceWeekly } from './_components/attendance-weekly';
import { AttendanceList } from './_components/attendance-list';
import { AttendanceSummary } from './_components/attendance-summary';
import { AdminAttendanceTable } from './_components/admin-attendance-table';
import { formatTime } from './_components/attendance-status';

/** Standard workday length in hours (ADR-019) — drives the hours-worked progress bar. */
const STANDARD_DAY_HOURS = 8;

const VIEW_TABS: { label: string; value: AttendanceRange }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

/**
 * Attendance page (PAGE 7). Employees check in/out and browse their attendance across
 * Daily / Weekly / Monthly views with a summary bar. ADMIN/HR additionally see the
 * all-employees table with CSV export. Data from the S06 attendance endpoints.
 */
export default function AttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'HR';

  const [range, setRange] = useState<AttendanceRange>('monthly');
  const [rows, setRows] = useState<MyAttendanceRow[]>([]);
  const [monthRows, setMonthRows] = useState<MyAttendanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRow = useMemo(
    () => monthRows.find((r) => r.date.slice(0, 10) === todayKey),
    [monthRows, todayKey],
  );

  const isCheckedIn = Boolean(todayRow?.checkInTime);
  const isCheckedOut = Boolean(todayRow?.checkOutTime);

  const loadRange = useCallback(
    async (r: AttendanceRange) => {
      setIsLoading(true);
      try {
        const page = await getMyAttendance(r);
        setRows(page.data);
        if (r === 'monthly') setMonthRows(page.data);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load attendance';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // Always keep the current month loaded so the header status + summary are accurate.
  const loadMonth = useCallback(async () => {
    try {
      const page = await getMyAttendance('monthly');
      setMonthRows(page.data);
    } catch {
      /* header status falls back to "not checked in" */
    }
  }, []);

  useEffect(() => {
    void loadRange(range);
  }, [range, loadRange]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRange(range), loadMonth()]);
  }, [loadRange, loadMonth, range]);

  const handleCheckIn = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await checkIn('Web');
      toast.success('Checked in successfully');
      await refreshAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Check-in failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshAll, toast]);

  const handleCheckOut = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await checkOut();
      toast.success(`Checked out — ${formatHours(res.hoursWorked)} worked`);
      await refreshAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Check-out failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshAll, toast]);

  const hoursToday = todayRow?.hoursWorked ?? 0;

  const statusLine = isCheckedOut
    ? `Checked out at ${formatTime(todayRow?.checkOutTime)}`
    : isCheckedIn
      ? `Checked in at ${formatTime(todayRow?.checkInTime)}`
      : 'Not checked in';

  return (
    <div className="flex flex-col gap-6">
      {/* Top: date, check-in/out, status, hours progress */}
      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Today
            </p>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {formatDate(new Date())}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{statusLine}</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            {!isCheckedIn ? (
              <Button
                size="lg"
                onClick={handleCheckIn}
                isLoading={isSubmitting}
                leftIcon={<LogIn className="h-5 w-5" />}
                className="!bg-success hover:!bg-[#059669]"
              >
                Check In
              </Button>
            ) : !isCheckedOut ? (
              <Button
                size="lg"
                variant="danger"
                onClick={handleCheckOut}
                isLoading={isSubmitting}
                leftIcon={<LogOut className="h-5 w-5" />}
              >
                Check Out
              </Button>
            ) : (
              <span className="rounded-btn bg-primary-tint px-4 py-2.5 text-sm font-semibold text-primary">
                Day complete
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-text-primary">Hours worked today</span>
            <span className="text-text-secondary">
              {formatHours(hoursToday)} / {STANDARD_DAY_HOURS}h
            </span>
          </div>
          <ProgressBar value={hoursToday} max={STANDARD_DAY_HOURS} color="secondary" size="lg" />
        </div>
      </div>

      {/* Summary bar (from current month) */}
      <AttendanceSummary rows={monthRows} />

      {/* View toggle */}
      <div className="inline-flex w-fit rounded-btn border border-border bg-card p-1 shadow-card">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRange(tab.value)}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
              range === tab.value
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active view */}
      {range === 'monthly' ? (
        <div className="flex flex-col gap-6">
          <AttendanceCalendar rows={rows} isLoading={isLoading} />
          <div>
            <h2 className="mb-2 font-display text-sm font-bold text-text-primary">
              Day-wise (this month)
            </h2>
            <AttendanceList rows={rows} isLoading={isLoading} />
          </div>
        </div>
      ) : range === 'weekly' ? (
        <AttendanceWeekly rows={rows} isLoading={isLoading} />
      ) : (
        <AttendanceList rows={rows} isLoading={isLoading} />
      )}

      {/* Admin all-employees table */}
      {isAdminOrHr && (
        <div className="mt-2 border-t border-border pt-6">
          <AdminAttendanceTable />
        </div>
      )}
    </div>
  );
}

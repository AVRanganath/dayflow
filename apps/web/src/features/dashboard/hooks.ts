'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { api } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { authStore } from '../../lib/auth/auth-store';
import type { AttendanceStatus, LeaveStatus, LeaveType, WorkStatus } from '@dayflow/shared';
import type {
  ActivityFeedItem,
  AdminLeaveRequestRow,
  AdminSummaryStats,
  AttendanceDonutData,
  DepartmentHeadcountItem,
  EmployeeStatsStrip,
  LeaveBalances,
  TodayAttendance,
  WeeklyDayItem,
  WeeklySummary,
} from './types';

// Helper for formatting time (e.g. 09:02 AM)
function formatTimeOnly(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Helper for formatting relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to format hours decimal/minutes
function formatHoursMinutes(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || hours === 0) return '0h 0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

interface RawAttendanceMeRow {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakMinutes: number;
  hoursWorked: number | null;
  extraHours: number | null;
  status: AttendanceStatus;
}

interface RawLeaveBalanceResponse {
  PAID?: { allocated: number; used: number; remaining: number };
  SICK?: { allocated: number; used: number; remaining: number };
  CASUAL?: { allocated: number; used: number; remaining: number };
}

interface RawLeaveMeRow {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

interface RawAdminLeaveRow extends RawLeaveMeRow {
  employeeId: string;
  employee?: { firstName: string; lastName: string; profilePicture?: string | null };
}

interface RawAttendanceSummary {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
}

interface RawEmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string | null;
  departmentId?: string | null;
  workStatus: WorkStatus;
}

interface RawDepartmentRow {
  id: string;
  name: string;
}

interface RawPayrollRecord {
  id: string;
  netSalary: number;
  month: string;
  payableDays: number;
  status: string;
}

/**
 * Hook for Employee Dashboard data, check-in/out mutations, and derived summaries.
 */
export function useEmployeeDashboard() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [, startTransition] = useTransition();

  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance>({
    isCheckedIn: false,
    checkInTime: null,
    checkOutTime: null,
    breakMinutes: 0,
    hoursWorked: null,
    hoursWorkedFormatted: '0h 0m',
    status: null,
    workStatus: 'ABSENT',
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalances>({
    paid: { allocated: 24, used: 0, remaining: 24 },
    sick: { allocated: 7, used: 0, remaining: 7 },
    casual: { allocated: 7, used: 0, remaining: 7 },
  });

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary>({
    days: [],
    totalHoursFormatted: '0h 0m',
    attendanceRate: 0,
  });

  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [statsStrip, setStatsStrip] = useState<EmployeeStatsStrip>({
    totalWorkingDays: 22,
    present: 0,
    absent: 0,
    leave: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [dailyRes, weeklyRes, balanceRes, leavesRes, employeeRes] = await Promise.allSettled([
        api.get<RawAttendanceMeRow[]>('/attendance/me', { params: { range: 'daily' } }),
        api.get<RawAttendanceMeRow[]>('/attendance/me', { params: { range: 'weekly' } }),
        api.get<RawLeaveBalanceResponse>('/leaves/balance/me'),
        api.get<RawLeaveMeRow[]>('/leaves/me', { params: { limit: 5 } }),
        api.get<{ workStatus?: WorkStatus }>('/employees/me'),
      ]);

      // 1. Process Today Attendance
      const dailyRows = dailyRes.status === 'fulfilled' ? dailyRes.value : [];
      const todayRow = Array.isArray(dailyRows) && dailyRows.length > 0 ? dailyRows[0] : null;
      const myWorkStatus: WorkStatus =
        employeeRes.status === 'fulfilled' && employeeRes.value?.workStatus
          ? employeeRes.value.workStatus
          : todayRow?.checkInTime && !todayRow.checkOutTime
            ? 'PRESENT'
            : 'ABSENT';

      // Update in-memory auth store workStatus if available
      const currentUser = authStore.getUser();
      if (currentUser && currentUser.workStatus !== myWorkStatus) {
        authStore.setUser({ ...currentUser, workStatus: myWorkStatus });
      }

      const isCheckedIn = Boolean(todayRow?.checkInTime && !todayRow?.checkOutTime);
      let calculatedHours = todayRow?.hoursWorked ?? null;

      // If currently checked in without checkout, calculate elapsed hours dynamically
      if (isCheckedIn && todayRow?.checkInTime) {
        const checkInDate = new Date(todayRow.checkInTime);
        const now = new Date();
        const diffHours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
        calculatedHours = Math.max(0, Math.round(diffHours * 100) / 100);
      }

      setTodayAttendance({
        isCheckedIn,
        checkInTime: formatTimeOnly(todayRow?.checkInTime),
        checkOutTime: formatTimeOnly(todayRow?.checkOutTime),
        breakMinutes: todayRow?.breakMinutes ?? 0,
        hoursWorked: calculatedHours,
        hoursWorkedFormatted: formatHoursMinutes(calculatedHours),
        status: todayRow?.status ?? null,
        workStatus: myWorkStatus,
      });

      // 2. Process Leave Balances (ADR-018)
      if (balanceRes.status === 'fulfilled' && balanceRes.value) {
        const b = balanceRes.value;
        setLeaveBalances({
          paid: b.PAID ?? { allocated: 24, used: 0, remaining: 24 },
          sick: b.SICK ?? { allocated: 7, used: 0, remaining: 7 },
          casual: b.CASUAL ?? { allocated: 7, used: 0, remaining: 7 },
        });
      }

      // 3. Process Weekly Summary (Mon-Fri)
      const weeklyRows = weeklyRes.status === 'fulfilled' ? weeklyRes.value : [];
      const weeklyMap = new Map<string, RawAttendanceMeRow>();
      if (Array.isArray(weeklyRows)) {
        weeklyRows.forEach((r) => {
          const key = r.date.split('T')[0] ?? r.date;
          weeklyMap.set(key, r);
        });
      }

      // Generate Mon-Fri for current week
      const todayObj = new Date();
      const currentDayOfWeek = todayObj.getDay(); // 0 is Sunday, 1 is Monday
      const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
      const monday = new Date(todayObj);
      monday.setDate(todayObj.getDate() + mondayOffset);

      const daysOfWeek: WeeklyDayItem[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((name, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        const dateStr = d.toISOString().split('T')[0] ?? '';
        const match = weeklyMap.get(dateStr);
        const isToday = dateStr === todayObj.toISOString().split('T')[0];

        let status: AttendanceStatus | 'ON_LEAVE' | 'ABSENT' | 'WEEKEND' = 'ABSENT';
        if (match) {
          status = match.status;
        } else if (isToday && isCheckedIn) {
          status = 'PRESENT';
        } else if (d > todayObj) {
          status = 'ABSENT';
        }

        const hrs = match?.hoursWorked ?? (isToday && isCheckedIn ? calculatedHours : 0);

        return {
          dayName: name,
          dateStr,
          status,
          hoursWorked: hrs,
          hoursFormatted: formatHoursMinutes(hrs),
          isToday,
        };
      });

      let totalWeeklyHours = 0;
      let presentDaysCount = 0;
      let workingDaysElapsed = 0;

      daysOfWeek.forEach((day) => {
        if (day.hoursWorked) totalWeeklyHours += day.hoursWorked;
        const dayDate = new Date(day.dateStr);
        if (dayDate <= todayObj) {
          workingDaysElapsed++;
          if (day.status === 'PRESENT' || day.status === 'HALF_DAY') {
            presentDaysCount += day.status === 'HALF_DAY' ? 0.5 : 1;
          }
        }
      });

      const attendanceRate =
        workingDaysElapsed > 0 ? Math.round((presentDaysCount / workingDaysElapsed) * 100) : 100;

      setWeeklySummary({
        days: daysOfWeek,
        totalHoursFormatted: formatHoursMinutes(totalWeeklyHours),
        attendanceRate,
      });

      // 4. Process Activity Feed
      const activities: ActivityFeedItem[] = [];
      if (todayRow?.checkInTime) {
        activities.push({
          id: `act-checkin-${todayRow.id}`,
          title: `Checked in at ${formatTimeOnly(todayRow.checkInTime)}`,
          timestamp: 'Today',
          dotColor: 'green',
          rawDate: new Date(todayRow.checkInTime),
        });
      }

      if (leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value)) {
        leavesRes.value.forEach((l) => {
          const appliedDate = new Date(l.createdAt);
          activities.push({
            id: `act-leave-${l.id}`,
            title: `Leave request (${l.leaveType}) ${l.status.toLowerCase()}`,
            timestamp: formatTimeAgo(appliedDate),
            dotColor: l.status === 'APPROVED' ? 'plum' : l.status === 'REJECTED' ? 'gray' : 'amber',
            rawDate: appliedDate,
          });
        });
      }

      // Add default welcome item if empty
      if (activities.length === 0) {
        activities.push({
          id: 'act-init',
          title: 'Account active and profile aligned',
          timestamp: 'Recently',
          dotColor: 'plum',
          rawDate: new Date(),
        });
      }

      // Sort activities newest first
      activities.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setActivityFeed(activities.slice(0, 5));

      // 5. Process Stats Strip
      let monthPresent = 0;
      let monthAbsent = 0;
      let monthLeave = 0;

      if (Array.isArray(weeklyRows)) {
        weeklyRows.forEach((r) => {
          if (r.status === 'PRESENT' || r.status === 'HALF_DAY') monthPresent++;
          else if (r.status === 'ON_LEAVE') monthLeave++;
          else monthAbsent++;
        });
      }

      setStatsStrip({
        totalWorkingDays: monthPresent + monthAbsent + monthLeave,
        present: Math.max(monthPresent, isCheckedIn ? 1 : 0),
        absent: monthAbsent,
        leave: monthLeave,
      });
    } catch {
      toast.error('Failed to fetch some attendance records. Please refresh.', 'Dashboard Error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check In Mutation
  const handleCheckIn = async () => {
    try {
      setIsMutating(true);
      await api.post('/attendance/check-in');
      toast.success('Your presence has been recorded for today.', 'Checked in successfully!');

      // Update auth store user status
      const u = authStore.getUser();
      if (u) authStore.setUser({ ...u, workStatus: 'PRESENT' });

      startTransition(() => {
        fetchData();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check in failed. Please try again.';
      toast.error(message, 'Check-in Error');
    } finally {
      setIsMutating(false);
    }
  };

  // Check Out Mutation
  const handleCheckOut = async (breakMinutes = 0) => {
    try {
      setIsMutating(true);
      await api.post('/attendance/check-out', { breakMinutes });
      toast.success('Your workday hours have been calculated.', 'Checked out successfully!');

      // Update auth store user status
      const u = authStore.getUser();
      if (u) authStore.setUser({ ...u, workStatus: 'ABSENT' });

      startTransition(() => {
        fetchData();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check out failed. Please try again.';
      toast.error(message, 'Check-out Error');
    } finally {
      setIsMutating(false);
    }
  };

  return {
    isLoading,
    isMutating,
    todayAttendance,
    leaveBalances,
    weeklySummary,
    activityFeed,
    statsStrip,
    checkIn: handleCheckIn,
    checkOut: handleCheckOut,
    refetch: fetchData,
  };
}

/**
 * Hook for Admin Dashboard data, live leave approval/rejection mutations, and chart datasets.
 */
export function useAdminDashboard() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);

  const [summaryStats, setSummaryStats] = useState<AdminSummaryStats>({
    totalEmployees: 0,
    presentToday: 0,
    presentPercentage: 0,
    pendingLeaves: 0,
    monthlyPayrollTotal: 0,
  });

  const [donutData, setDonutData] = useState<AttendanceDonutData>({
    present: 0,
    absent: 0,
    halfDay: 0,
    onLeave: 0,
    total: 0,
    presentPercentage: 0,
    dateSubtitle: 'Today',
  });

  const [leaveRequests, setLeaveRequests] = useState<AdminLeaveRequestRow[]>([]);
  const [departmentHeadcount, setDepartmentHeadcount] = useState<DepartmentHeadcountItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // NOTE: the api client unwraps the envelope and returns `json.data`, so list
      // endpoints come back as bare arrays (meta is dropped) — not `{ items }`/`{ data }`.
      const [summaryRes, leavesRes, payrollRes, employeesRes, deptRes] = await Promise.allSettled([
        api.get<RawAttendanceSummary>('/attendance/summary'),
        api.get<RawAdminLeaveRow[]>('/leaves', { params: { limit: 10 } }),
        api.get<RawPayrollRecord[]>('/payroll', { params: { limit: 100 } }),
        api.get<RawEmployeeRow[]>('/employees', { params: { limit: 100 } }),
        api.get<RawDepartmentRow[]>('/departments'),
      ]);

      // 1. Process Attendance Summary & Donut Data
      const summary: RawAttendanceSummary =
        summaryRes.status === 'fulfilled' && summaryRes.value
          ? summaryRes.value
          : { totalEmployees: 0, present: 0, absent: 0, onLeave: 0 };

      const total = Math.max(summary.totalEmployees, 0);
      const present = Math.max(summary.present, 0);
      const onLeave = Math.max(summary.onLeave, 0);
      const absent = Math.max(summary.absent, 0);
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      setDonutData({
        present,
        absent,
        halfDay: 0,
        onLeave,
        total,
        presentPercentage: pct,
        dateSubtitle: `Today, ${todayFormatted}`,
      });

      // 2. Process Payroll Records (ADR-013/014 totals)
      let payrollTotal = 0;
      if (payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value)) {
        payrollTotal = payrollRes.value.reduce((acc, row) => acc + (Number(row.netSalary) || 0), 0);
      }

      // 3. Process Leave Requests
      let pendingCount = 0;
      const rawLeaves = leavesRes.status === 'fulfilled' ? (leavesRes.value ?? []) : [];
      const employees = employeesRes.status === 'fulfilled' ? (employeesRes.value ?? []) : [];
      const empStatusMap = new Map<string, WorkStatus>();
      employees.forEach((emp) => {
        empStatusMap.set(emp.id, emp.workStatus);
      });

      const formattedLeaveRows: AdminLeaveRequestRow[] = rawLeaves.map((l) => {
        if (l.status === 'PENDING') pendingCount++;
        const empName = l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee';
        const start = new Date(l.startDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const end = new Date(l.endDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return {
          id: l.id,
          employeeId: l.employeeId,
          employeeName: empName,
          employeeAvatar: l.employee?.profilePicture || null,
          workStatus: empStatusMap.get(l.employeeId) || 'ABSENT',
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          dateRange: `${start} – ${end} (${l.totalDays} ${l.totalDays === 1 ? 'day' : 'days'})`,
          totalDays: l.totalDays,
          reason: l.reason,
          status: l.status,
          appliedAt: l.createdAt,
        };
      });

      setLeaveRequests(formattedLeaveRows);

      // 4. Update 4 StatsCards
      setSummaryStats({
        totalEmployees: total || employees.length,
        presentToday: present,
        presentPercentage: pct,
        pendingLeaves: pendingCount,
        monthlyPayrollTotal: payrollTotal,
      });

      // 5. Process Department Headcount
      const depts = deptRes.status === 'fulfilled' ? deptRes.value || [] : [];
      const deptMap = new Map<string, string>();
      depts.forEach((d) => deptMap.set(d.id, d.name));

      const deptCounts = new Map<string, number>();
      employees.forEach((emp) => {
        const deptName = emp.departmentId ? deptMap.get(emp.departmentId) || 'Other' : 'General';
        deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);
      });

      const maxCount = Math.max(...Array.from(deptCounts.values()), 1);
      const headcountList: DepartmentHeadcountItem[] = Array.from(deptCounts.entries())
        .map(([name, count], index) => ({
          id: `dept-${index}`,
          name,
          count,
          percentage: Math.round((count / maxCount) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      setDepartmentHeadcount(headcountList);
    } catch {
      toast.error('Failed to retrieve administrative summaries.', 'Admin Data Error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Approve Leave Request Mutation
  const handleApproveLeave = async (leaveId: string) => {
    try {
      setIsProcessingAction(leaveId);
      await api.patch(`/leaves/${leaveId}/approve`);
      toast.success('The leave request has been approved successfully.', 'Leave Approved');

      // Optimistically update local state
      setLeaveRequests((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'APPROVED' } : req)),
      );
      setSummaryStats((prev) => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1),
      }));

      // Refetch for full consistency
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve leave.';
      toast.error(msg, 'Approval Failed');
    } finally {
      setIsProcessingAction(null);
    }
  };

  // Reject Leave Request Mutation (ADR-006 captures reason)
  const handleRejectLeave = async (leaveId: string, reason: string) => {
    try {
      setIsProcessingAction(leaveId);
      await api.patch(`/leaves/${leaveId}/reject`, { reason });
      toast.info('The leave request has been marked as rejected.', 'Leave Rejected');

      // Optimistically update local state
      setLeaveRequests((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'REJECTED' } : req)),
      );
      setSummaryStats((prev) => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1),
      }));

      // Refetch for consistency
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject leave.';
      toast.error(msg, 'Rejection Failed');
    } finally {
      setIsProcessingAction(null);
    }
  };

  return {
    isLoading,
    isProcessingAction,
    summaryStats,
    donutData,
    leaveRequests,
    departmentHeadcount,
    approveLeave: handleApproveLeave,
    rejectLeave: handleRejectLeave,
    refetch: fetchData,
  };
}

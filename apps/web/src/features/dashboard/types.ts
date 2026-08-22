import type { AttendanceStatus, LeaveStatus, LeaveType, WorkStatus } from '@dayflow/shared';

export interface TodayAttendance {
  isCheckedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakMinutes: number;
  hoursWorked: number | null;
  hoursWorkedFormatted: string;
  status: AttendanceStatus | null;
  workStatus: WorkStatus;
}

export interface WeeklyDayItem {
  dayName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  dateStr: string; // '2026-08-17'
  status: AttendanceStatus | 'ON_LEAVE' | 'ABSENT' | 'WEEKEND';
  hoursWorked: number | null;
  hoursFormatted: string;
  isToday: boolean;
}

export interface WeeklySummary {
  days: WeeklyDayItem[];
  totalHoursFormatted: string;
  attendanceRate: number; // 0..100
}

export interface LeaveBalanceLine {
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveBalances {
  paid: LeaveBalanceLine;
  sick: LeaveBalanceLine;
  casual: LeaveBalanceLine;
}

export interface ActivityFeedItem {
  id: string;
  title: string;
  timestamp: string;
  dotColor: 'green' | 'plum' | 'amber' | 'gray';
  rawDate: Date;
}

export interface EmployeeStatsStrip {
  totalWorkingDays: number;
  present: number;
  absent: number;
  leave: number;
}

export interface AdminSummaryStats {
  totalEmployees: number;
  presentToday: number;
  presentPercentage: number;
  pendingLeaves: number;
  monthlyPayrollTotal: number;
}

export interface AdminLeaveRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string | null;
  workStatus: WorkStatus;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dateRange: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
}

export interface AttendanceDonutData {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  total: number;
  presentPercentage: number;
  dateSubtitle: string;
}

export interface DepartmentHeadcountItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

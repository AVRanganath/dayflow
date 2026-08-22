'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Button,
  DataTable,
  Select,
  StatusBadge,
  useToast,
  type Column,
} from '../../../../components/ui';
import { formatHours, formatDate } from '../../../../lib/format';
import { getAllAttendance, type AdminAttendanceRow } from '../../../../lib/api/attendance';
import { getEmployeeOptions, type EmployeeOption } from '../../../../lib/api/leaves';
import { toCsv, downloadCsv } from '../../../../lib/csv';
import { ApiError } from '../../../../lib/api/types';
import { formatTime } from './attendance-status';

/**
 * ADMIN/HR all-employees attendance table (PAGE 7). Shows Employee | Today Status |
 * Check In | Check Out | Hours | (status), with an employee-selector dropdown and a
 * client-side CSV export of the current filtered rows (differentiator #5).
 */
export function AdminAttendanceTable() {
  const toast = useToast();
  const [rows, setRows] = useState<AdminAttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const page = await getAllAttendance({ date: today });
      setRows(page.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load attendance';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [today, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    getEmployeeOptions()
      .then(setEmployees)
      .catch(() => {
        /* employee list is a convenience filter; ignore load failure */
      });
  }, []);

  const filteredRows = useMemo(
    () => (selectedEmployeeId ? rows.filter((r) => r.employeeId === selectedEmployeeId) : rows),
    [rows, selectedEmployeeId],
  );

  const employeeOptions = useMemo(
    () => [
      { label: 'All employees', value: '' },
      ...employees.map((e) => ({
        label: `${e.firstName} ${e.lastName}`,
        value: e.id,
      })),
    ],
    [employees],
  );

  const handleExport = useCallback(() => {
    const csv = toCsv(filteredRows, [
      { header: 'Employee', value: (r) => r.employee.name },
      { header: 'Date', value: (r) => r.date.slice(0, 10) },
      { header: 'Status', value: (r) => r.status },
      { header: 'Check In', value: (r) => formatTime(r.checkInTime) },
      { header: 'Check Out', value: (r) => formatTime(r.checkOutTime) },
      { header: 'Hours Worked', value: (r) => r.hoursWorked ?? 0 },
      { header: 'Extra Hours', value: (r) => r.extraHours ?? 0 },
      { header: 'Break (min)', value: (r) => r.breakMinutes ?? 0 },
    ]);
    downloadCsv(csv, 'attendance.csv');
    toast.success('Exported attendance.csv');
  }, [filteredRows, toast]);

  const columns: Column<AdminAttendanceRow>[] = [
    { key: 'employee', header: 'Employee', render: (r) => r.employee.name },
    {
      key: 'status',
      header: 'Today Status',
      render: (r) => <StatusBadge status={r.status} dot />,
    },
    { key: 'checkInTime', header: 'Check In', render: (r) => formatTime(r.checkInTime) },
    { key: 'checkOutTime', header: 'Check Out', render: (r) => formatTime(r.checkOutTime) },
    {
      key: 'hoursWorked',
      header: 'Hours',
      align: 'right',
      render: (r) => (r.hoursWorked ? formatHours(r.hoursWorked) : '—'),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-text-primary">All Employees</h2>
          <p className="text-xs text-text-secondary">Attendance for {formatDate(today)}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-56">
            <Select
              label="Employee"
              options={employeeOptions}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        emptyState={<p className="text-sm text-text-muted">No attendance records for this day.</p>}
      />
    </div>
  );
}

export default AdminAttendanceTable;

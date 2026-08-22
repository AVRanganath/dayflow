'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AllocateLeaveSchema, type LeaveType } from '@dayflow/shared';
import { Button, Input, Modal, Select, useToast } from '../../../../../components/ui';
import {
  allocateLeave,
  getEmployeeOptions,
  type EmployeeOption,
} from '../../../../../lib/api/leaves';
import { ApiError } from '../../../../../lib/api/types';

export interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful allocation so the caller can refresh. */
  onAllocated: () => void;
}

/** Allocatable leave types (ADR-004 tracked balances). */
const ALLOCATION_TYPES: { label: string; value: LeaveType }[] = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Sick', value: 'SICK' },
  { label: 'Casual', value: 'CASUAL' },
];

/**
 * ADMIN/HR leave-allocation modal (ADR-018). Pick an employee + leave type + number of
 * days → `POST /leaves/allocations`. Zod-validates against the shared schema.
 */
export function AllocationModal({ isOpen, onClose, onAllocated }: AllocationModalProps) {
  const toast = useToast();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<LeaveType>('PAID');
  const [days, setDays] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getEmployeeOptions()
      .then((list) => {
        setEmployees(list);
        const first = list[0];
        if (first) setEmployeeId((prev) => prev || first.id);
      })
      .catch(() => {
        toast.error('Failed to load employees');
      });
  }, [isOpen, toast]);

  const handleSubmit = useCallback(async () => {
    const payload = {
      employeeId,
      type,
      totalAllowed: Number(days),
    };
    const parsed = AllocateLeaveSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await allocateLeave(parsed.data);
      toast.success('Leave balance allocated');
      setDays('');
      onAllocated();
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Allocation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [employeeId, type, days, toast, onAllocated, onClose]);

  const employeeOptions = employees.map((e) => ({
    label: `${e.firstName} ${e.lastName} (${e.email})`,
    value: e.id,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allocate Leave"
      description="Set an employee's leave balance for the current year."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={employees.length === 0}>
            Allocate
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Employee"
          required
          options={employeeOptions}
          value={employeeId}
          error={errors.employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <Select
          label="Leave Type"
          required
          options={ALLOCATION_TYPES}
          value={type}
          onChange={(e) => setType(e.target.value as LeaveType)}
        />
        <Input
          label="Number of Days"
          type="number"
          min={0}
          required
          value={days}
          error={errors.totalAllowed}
          placeholder="e.g. 24"
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
    </Modal>
  );
}

export default AllocationModal;

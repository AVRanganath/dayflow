'use client';

import React, { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import { CreateEmployeeSchema, type EmploymentType } from '@dayflow/shared';
import { Button, Input, Modal, Select } from '../../../../components/ui';
import {
  createEmployee,
  type CreateEmployeeResult,
  type Department,
} from '../../../../lib/employees';
import { ApiError } from '../../../../lib/api/types';

export interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  /** Called after a successful create so the directory list refetches. */
  onCreated: () => void;
}

const EMPLOYMENT_TYPE_OPTIONS: { label: string; value: EmploymentType }[] = [
  { label: 'Full-time', value: 'FULL_TIME' },
  { label: 'Part-time', value: 'PART_TIME' },
  { label: 'Contract', value: 'CONTRACT' },
  { label: 'Intern', value: 'INTERN' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'EMPLOYEE' as 'EMPLOYEE' | 'HR',
  dateOfJoining: '',
  employmentType: 'FULL_TIME' as EmploymentType,
  departmentId: '',
  designation: '',
  phone: '',
};

/**
 * Admin/HR "Add Employee" modal (PAGE 6, ADR-012). The server auto-generates the
 * employee's Login ID and a one-time temporary password — this modal's second
 * step shows that credential exactly once (it cannot be retrieved again) so the
 * admin can hand it to the new hire.
 */
export function CreateEmployeeModal({
  isOpen,
  onClose,
  departments,
  onCreated,
}: CreateEmployeeModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateEmployeeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFinish = () => {
    reset();
    onClose();
    onCreated();
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = CreateEmployeeSchema.safeParse({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      role: form.role,
      dateOfJoining: form.dateOfJoining,
      employmentType: form.employmentType,
      departmentId: form.departmentId || undefined,
      designation: form.designation.trim() || undefined,
      phone: form.phone.trim() || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const created = await createEmployee(parsed.data);
      setResult(created);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    void navigator.clipboard.writeText(
      `Login ID: ${result.loginId}\nTemporary password: ${result.temporaryPassword}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={result ? handleFinish : handleClose}
      title={result ? 'Employee created' : 'Add Employee'}
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">
            <strong className="text-text-primary">
              {result.firstName} {result.lastName}
            </strong>{' '}
            has been added. Share these one-time credentials with them — the password will not be
            shown again.
          </p>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Login credentials</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 font-mono text-sm">
              <span className="text-text-secondary">Login ID</span>
              <span className="font-semibold text-text-primary">{result.loginId}</span>
              <span className="text-text-secondary">Password</span>
              <span className="font-semibold text-text-primary">{result.temporaryPassword}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={handleFinish}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="rounded-card border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger-dark">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              error={errors.firstName}
              required
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              error={errors.lastName}
              required
            />
          </div>

          <Input
            label="Work email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => set('role', e.target.value as 'EMPLOYEE' | 'HR')}
              options={[
                { label: 'Employee', value: 'EMPLOYEE' },
                { label: 'HR', value: 'HR' },
              ]}
            />
            <Select
              label="Employment type"
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value as EmploymentType)}
              options={EMPLOYMENT_TYPE_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Department"
              value={form.departmentId}
              onChange={(e) => set('departmentId', e.target.value)}
              error={errors.departmentId}
              options={[
                { label: 'Unassigned', value: '' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ]}
            />
            <Input
              label="Date of joining"
              type="date"
              value={form.dateOfJoining}
              onChange={(e) => set('dateOfJoining', e.target.value)}
              error={errors.dateOfJoining}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => set('designation', e.target.value)}
              error={errors.designation}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={errors.phone}
            />
          </div>

          <p className="text-[11px] text-text-muted">
            A Login ID and temporary password are generated automatically and shown once the account
            is created.
          </p>

          <div className="mt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Create Employee
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, useToast } from '../../../../components/ui';
import { formatINR } from '../../../../lib/format';
import { computeSalary, getEmployeePayroll, updateSalaryStructure } from '../../../../lib/payroll';

interface EditSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Employee whose salary structure is being edited. */
  employee: { id: string; name: string } | null;
  /** Called after a successful save so the parent can refresh the bulk table. */
  onSaved: () => void;
}

/**
 * ADMIN-only salary-structure editor (ADR-013). Loads the employee's current structure,
 * lets the admin edit the monthly Wage, and previews the recomputed components live
 * (Fixed Allowance balances so total === Wage). Zod-validates (wage positive) and
 * submits `PUT /payroll/:employeeId/salary-structure`. All amounts INR (ADR-008).
 */
export function EditSalaryModal({ isOpen, onClose, employee, onSaved }: EditSalaryModalProps) {
  const toast = useToast();
  const [wageInput, setWageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the current structure when the modal opens for an employee.
  useEffect(() => {
    if (!isOpen || !employee) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getEmployeePayroll(employee.id)
      .then((structure) => {
        if (!cancelled) setWageInput(String(structure.monthlyWage));
      })
      .catch((err) => {
        if (!cancelled) {
          // S08 not merged yet, or no structure set — start from a blank wage.
          setWageInput('');
          setError(
            err instanceof Error
              ? `Could not load current structure (${err.message}). Enter a wage to set one.`
              : 'Could not load current structure.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, employee]);

  const wage = Number(wageInput);
  const computed = useMemo(() => computeSalary(wage), [wage]);
  const wageValid = wageInput.trim() !== '' && Number.isFinite(wage) && wage > 0;

  const handleSave = async () => {
    if (!employee) return;
    // Mirror SalaryStructureSchema (ADR-013): wage must be a positive number.
    if (!Number.isFinite(wage) || wage <= 0) {
      setError('Monthly wage must be positive');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateSalaryStructure(employee.id, { wage });
      toast.success(`Salary structure updated for ${employee.name}.`);
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update salary structure.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const rows: Array<{ label: string; amount: number; strong?: boolean }> = [
    { label: 'Basic Salary', amount: computed.basic },
    { label: 'House Rent Allowance (HRA)', amount: computed.hra },
    { label: 'Standard Allowance', amount: computed.standardAllowance },
    { label: 'Performance Bonus', amount: computed.performanceBonus },
    { label: 'Leave Travel Allowance (LTA)', amount: computed.lta },
    { label: 'Fixed Allowance (balancer)', amount: computed.fixedAllowance },
    { label: 'Gross (= Wage)', amount: computed.gross, strong: true },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Salary Structure"
      description={employee ? employee.name : undefined}
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!wageValid || isLoading}
          >
            Save Structure
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Monthly Wage"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={wageInput}
          onChange={(e) => setWageInput(e.target.value)}
          placeholder="e.g. 50000"
          disabled={isLoading}
          error={
            wageInput.trim() !== '' && !wageValid ? 'Monthly wage must be positive' : undefined
          }
          helperText="Components auto-recompute from the wage (ADR-013). All amounts in INR."
        />

        {error && (
          <p className="rounded border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
            {error}
          </p>
        )}

        {/* Live recompute preview */}
        <div className="rounded-card border border-border bg-background p-4">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Earnings preview
          </h4>
          <div className="flex flex-col">
            {rows.map((row) => (
              <div
                key={row.label}
                className={
                  'flex items-center justify-between py-1.5 ' +
                  (row.strong ? 'mt-1 border-t border-border pt-2.5' : 'border-b border-hairline')
                }
              >
                <span
                  className={
                    row.strong
                      ? 'text-[13px] font-bold text-text-primary'
                      : 'text-[13px] text-text-secondary'
                  }
                >
                  {row.label}
                </span>
                <span
                  className={
                    'tabular-nums ' +
                    (row.strong
                      ? 'text-sm font-bold text-text-primary'
                      : 'text-[13px] font-medium text-text-primary')
                  }
                >
                  {formatINR(row.amount)}
                </span>
              </div>
            ))}
          </div>

          <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-danger">
            Deductions preview
          </h4>
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-hairline py-1.5">
              <span className="text-[13px] text-text-secondary">
                Provident Fund — Employee (12% of Basic)
              </span>
              <span className="text-[13px] font-medium text-text-primary tabular-nums">
                {formatINR(computed.pfEmployee)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-hairline py-1.5">
              <span className="text-[13px] text-text-secondary">
                Provident Fund — Employer (CTC only)
              </span>
              <span className="text-[13px] font-medium text-text-primary tabular-nums">
                {formatINR(computed.pfEmployer)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-hairline py-1.5">
              <span className="text-[13px] text-text-secondary">Professional Tax</span>
              <span className="text-[13px] font-medium text-text-primary tabular-nums">
                {formatINR(computed.professionalTax)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded bg-primary-tint px-4 py-2.5">
            <span className="text-[13px] font-semibold text-primary">Monthly Net (take-home)</span>
            <span className="font-display text-base font-bold text-primary tabular-nums">
              {formatINR(computed.monthlyNet)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EditSalaryModal;

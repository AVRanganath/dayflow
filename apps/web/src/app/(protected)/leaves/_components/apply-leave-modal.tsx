'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { ApplyLeaveSchema, type LeaveType } from '@dayflow/shared';
import { Button, Input, Modal, Select, Textarea, useToast } from '../../../../components/ui';
import { applyLeave } from '../../../../lib/api/leaves';
import { ApiError } from '../../../../lib/api/types';
import { countWorkingDays } from '../../../../lib/working-days';

export interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful submit so the page can refresh balances + history. */
  onApplied: () => void;
}

/** Leave types offered in the apply form (ADR-004). */
const LEAVE_TYPE_OPTIONS: { label: string; value: LeaveType }[] = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Sick', value: 'SICK' },
  { label: 'Casual', value: 'CASUAL' },
  { label: 'Unpaid', value: 'UNPAID' },
];

/**
 * Apply-for-leave modal (PAGE 8). Auto-calculates Total Days (weekends skipped,
 * differentiator #4), Zod-validates against the shared `ApplyLeaveSchema`, and supports
 * a sick-leave attachment upload (ADR-018) → `POST /leaves`.
 */
export function ApplyLeaveModal({ isOpen, onClose, onApplied }: ApplyLeaveModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<LeaveType>('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDays = useMemo(
    () => countWorkingDays(startDate, endDate),
    [startDate, endDate],
  );

  const reset = useCallback(() => {
    setType('PAID');
    setStartDate('');
    setEndDate('');
    setReason('');
    setFile(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    // Convert the date-only inputs to ISO datetimes for the shared schema.
    const payload = {
      type,
      startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : '',
      endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`).toISOString() : '',
      reason,
    };

    const parsed = ApplyLeaveSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await applyLeave({
        type: parsed.data.type,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        reason: parsed.data.reason,
        file,
      });
      toast.success('Leave request submitted');
      reset();
      onApplied();
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit leave request';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [type, startDate, endDate, reason, file, toast, reset, onApplied, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply for Leave"
      description="Weekends are excluded from the total day count."
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Submit Request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Leave Type"
          required
          options={LEAVE_TYPE_OPTIONS}
          value={type}
          onChange={(e) => setType(e.target.value as LeaveType)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            required
            value={startDate}
            error={errors.startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            required
            value={endDate}
            min={startDate || undefined}
            error={errors.endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="rounded border border-border bg-background px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-text-primary">Total Days</span>
            <span className="font-display text-lg font-bold text-primary">{totalDays}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Working days only (Mon–Fri). The server count is authoritative.
          </p>
        </div>

        <Textarea
          label="Reason"
          required
          rows={3}
          value={reason}
          placeholder="Brief reason for your leave (min. 10 characters)"
          error={errors.reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Attachment (ADR-018) — e.g. sick-leave certificate */}
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-text-primary">
            Attachment{' '}
            <span className="font-normal text-text-muted">
              (optional — e.g. sick-leave certificate)
            </span>
          </label>
          {file ? (
            <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm">
              <span className="flex items-center gap-2 truncate text-text-primary">
                <Paperclip className="h-4 w-4 flex-shrink-0 text-text-muted" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-text-muted hover:text-danger"
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-border px-3 py-3 text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary"
            >
              <Paperclip className="h-4 w-4" />
              Attach a file
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </Modal>
  );
}

export default ApplyLeaveModal;

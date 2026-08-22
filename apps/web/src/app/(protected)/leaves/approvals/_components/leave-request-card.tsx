'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Paperclip, X } from 'lucide-react';
import { RejectLeaveSchema } from '@dayflow/shared';
import { Avatar, Button, StatusBadge, Textarea } from '../../../../../components/ui';
import { formatDate } from '../../../../../lib/format';
import type { AdminLeaveRow } from '../../../../../lib/api/leaves';

export interface LeaveRequestCardProps {
  request: AdminLeaveRow;
  /** Department name resolved by the page (the leave row carries only the name). */
  departmentName?: string | null;
  /** Small balance summary line (e.g. "Casual: 7 left") shown under the request. */
  balanceLine?: string | null;
  /** Approves the request with optional notes; resolves when the API call completes. */
  onApprove: (id: string, notes?: string) => Promise<void>;
  /** Rejects the request with a required reason. */
  onReject: (id: string, reason: string) => Promise<void>;
}

type PendingAction = 'approve' | 'reject' | null;

/**
 * A single pending leave request card (PAGE 9). Shows the employee, leave-type badge,
 * date range with day count, expandable reason, applied-on, and Approve/Reject actions.
 * A comment textarea appears on action; reject requires a reason (min length per schema).
 */
export function LeaveRequestCard({
  request,
  departmentName,
  balanceLine,
  onApprove,
  onReject,
}: LeaveRequestCardProps) {
  const [action, setAction] = useState<PendingAction>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employeeName = `${request.employee.firstName} ${request.employee.lastName}`;

  const reasonIsLong = request.reason.length > 120;
  const shownReason = expanded || !reasonIsLong ? request.reason : `${request.reason.slice(0, 120)}…`;

  const startAction = (next: PendingAction) => {
    setAction(next);
    setComment('');
    setCommentError(undefined);
  };

  const submit = async () => {
    if (action === 'reject') {
      const parsed = RejectLeaveSchema.safeParse({ reason: comment });
      if (!parsed.success) {
        setCommentError(parsed.error.issues[0]?.message ?? 'A rejection reason is required');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      if (action === 'approve') {
        await onApprove(request.id, comment.trim() || undefined);
      } else if (action === 'reject') {
        await onReject(request.id, comment.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Avatar name={employeeName} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{employeeName}</span>
              <StatusBadge status={request.leaveType} />
            </div>
            {departmentName && (
              <p className="text-xs text-text-secondary">{departmentName}</p>
            )}
            <p className="mt-1 text-[13px] font-medium text-text-primary">
              {formatDate(request.startDate)} – {formatDate(request.endDate)}{' '}
              <span className="font-normal text-text-secondary">({request.totalDays} days)</span>
            </p>
            <p className="mt-1 text-[13px] text-text-secondary">{shownReason}</p>
            {reasonIsLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-primary"
              >
                {expanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
            <p className="mt-2 text-[11px] text-text-muted">
              Applied on {formatDate(request.createdAt)}
            </p>
            {balanceLine && (
              <p className="text-[11px] text-text-muted">Balance — {balanceLine}</p>
            )}
            {request.attachmentUrl && (
              <a
                href={request.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex w-fit items-center gap-1 text-xs text-secondary underline"
              >
                <Paperclip className="h-3 w-3" /> Attachment
              </a>
            )}
          </div>
        </div>

        {!action && (
          <div className="flex flex-shrink-0 gap-2">
            <Button
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={() => startAction('approve')}
              className="!bg-success hover:!bg-[#059669]"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              leftIcon={<X className="h-4 w-4" />}
              onClick={() => startAction('reject')}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {action && (
        <div className="mt-4 border-t border-hairline pt-4">
          <Textarea
            label={action === 'approve' ? 'Comment (optional)' : 'Rejection reason'}
            rows={2}
            value={comment}
            placeholder={
              action === 'approve'
                ? 'Add a comment (optional)'
                : 'Explain why this request is rejected (required)'
            }
            error={commentError}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAction(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={action === 'reject' ? 'danger' : 'primary'}
              onClick={submit}
              isLoading={isSubmitting}
              className={action === 'approve' ? '!bg-success hover:!bg-[#059669]' : undefined}
            >
              Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveRequestCard;

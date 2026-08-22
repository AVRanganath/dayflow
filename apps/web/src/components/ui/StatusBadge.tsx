'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'plum'
  | 'neutral';

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Resolves standard domain status strings to appropriate variant & label.
 */
function resolveStatusConfig(status?: string): { variant: StatusVariant; label: string } {
  if (!status) {
    return { variant: 'neutral', label: '' };
  }

  const s = status.toUpperCase().replace(/\s+/g, '_');

  switch (s) {
    case 'APPROVED':
    case 'PRESENT':
    case 'CHECKED_IN':
    case 'ACTIVE':
    case 'PROCESSED':
    case 'CASUAL':
      return { variant: 'success', label: formatLabel(status) };

    case 'PENDING':
    case 'HALF_DAY':
    case 'SICK':
    case 'MARKETING':
      return { variant: 'warning', label: formatLabel(status) };

    case 'REJECTED':
    case 'ABSENT':
    case 'INACTIVE':
      return { variant: 'danger', label: formatLabel(status) };

    case 'PAID':
    case 'ENGINEERING':
      return { variant: 'info', label: formatLabel(status) };

    case 'ON_LEAVE':
    case 'LEAVE':
    case 'DESIGN':
    case 'HR':
      return { variant: 'plum', label: formatLabel(status) };

    case 'UNPAID':
    case 'NOT_CHECKED_IN':
    default:
      return { variant: 'neutral', label: formatLabel(status) };
  }
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Reusable StatusBadge pill primitive per the Dayflow Design System.
 * Radius: 99px (pill), subtle tint background with matching dark text.
 */
export function StatusBadge({
  status,
  variant,
  dot = false,
  className,
  children,
}: StatusBadgeProps) {
  const resolved = status ? resolveStatusConfig(status) : { variant: variant || 'neutral', label: '' };
  const finalVariant = variant || resolved.variant;
  const label = children || resolved.label;

  const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
    success: {
      badge: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]/60',
      dot: 'bg-[#10B981]',
    },
    warning: {
      badge: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]/60',
      dot: 'bg-[#F59E0B]',
    },
    danger: {
      badge: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]/60',
      dot: 'bg-[#EF4444]',
    },
    info: {
      badge: 'bg-[#E0F0F1] text-[#017E84] border border-[#BCE1E3]/60',
      dot: 'bg-[#017E84]',
    },
    plum: {
      badge: 'bg-[#F4EEF3] text-[#714B67] border border-[#D6C4D1]/60',
      dot: 'bg-[#714B67]',
    },
    neutral: {
      badge: 'bg-[#EDEFF1] text-[#6C757D] border border-[#DEE2E6]/60',
      dot: 'bg-[#98A0A8]',
    },
  };

  const current = variantStyles[finalVariant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold tracking-wide select-none',
          current.badge,
          className,
        ),
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', current.dot)} />}
      {label}
    </span>
  );
}

export default StatusBadge;

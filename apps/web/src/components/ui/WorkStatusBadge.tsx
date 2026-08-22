'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { WorkStatus } from '@dayflow/shared';
import { Plane } from 'lucide-react';

export interface WorkStatusBadgeProps {
  status?: WorkStatus | string | null;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ADR-017 Work-status indicator component:
 * 🟢 PRESENT — present today with check-in (#10B981)
 * 🟡 ABSENT — not checked in today (#F59E0B)
 * ✈️ ON_LEAVE — on approved leave today (#714B67)
 */
export function WorkStatusBadge({
  status,
  showText = false,
  size = 'md',
  className,
}: WorkStatusBadgeProps) {
  const normalizedStatus = (status?.toUpperCase() || 'ABSENT') as WorkStatus;

  const configMap: Record<
    WorkStatus,
    { label: string; dotClass: string; textClass: string; bgClass: string; icon?: React.ReactNode }
  > = {
    PRESENT: {
      label: 'Present',
      dotClass: 'bg-success ring-card',
      textClass: 'text-success',
      bgClass: 'bg-success/10 text-success border-success/20',
    },
    ABSENT: {
      label: 'Absent',
      dotClass: 'bg-warning ring-card',
      textClass: 'text-warning',
      bgClass: 'bg-warning/10 text-warning border-warning/20',
    },
    ON_LEAVE: {
      label: 'On Leave',
      dotClass: 'bg-primary ring-card',
      textClass: 'text-primary',
      bgClass: 'bg-primary-tint text-primary border-primary-tint-border',
      icon: <Plane className="h-2.5 w-2.5 inline-block -rotate-45" />,
    },
  };

  const config = configMap[normalizedStatus] || configMap.ABSENT;

  const dotSizeMap = {
    sm: 'h-2 w-2 ring-1',
    md: 'h-2.5 w-2.5 ring-2',
    lg: 'h-3 w-3 ring-2',
  };

  if (!showText) {
    return (
      <span
        title={config.label}
        className={twMerge(
          clsx(
            'inline-block rounded-full flex-shrink-0',
            config.dotClass,
            dotSizeMap[size],
            className,
          ),
        )}
      />
    );
  }

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[11px] font-semibold select-none',
          config.bgClass,
          className,
        ),
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      <span>{config.label}</span>
      {normalizedStatus === 'ON_LEAVE' && config.icon}
    </span>
  );
}

export default WorkStatusBadge;

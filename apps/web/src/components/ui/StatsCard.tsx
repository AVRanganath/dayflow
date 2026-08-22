'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type StatsTileColor = 'teal' | 'green' | 'amber' | 'plum' | 'neutral';

export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tileColor?: StatsTileColor;
  delta?: {
    text: string;
    isPositive?: boolean;
    variant?: 'success' | 'warning' | 'danger' | 'neutral';
  };
  onClick?: () => void;
  className?: string;
}

/**
 * Reusable StatsCard primitive per the Dayflow Design System.
 * Features 32px rounded icon tile, Montserrat bold stat value, and delta indicator.
 */
export function StatsCard({
  label,
  value,
  icon,
  tileColor = 'neutral',
  delta,
  onClick,
  className,
}: StatsCardProps) {
  const isClickable = Boolean(onClick);

  const tileStyles: Record<StatsTileColor, string> = {
    teal: 'bg-[#E0F0F1] text-[#017E84]',
    green: 'bg-[#D1FAE5] text-[#059669]',
    amber: 'bg-[#FEF3C7] text-[#B45309]',
    plum: 'bg-[#F2EBF0] text-[#8A5B7E]',
    neutral: 'bg-[#EDEFF1] text-[#6C757D]',
  };

  const deltaColors = {
    success: 'text-success font-semibold',
    warning: 'text-warning font-semibold',
    danger: 'text-danger font-semibold',
    neutral: 'text-text-secondary',
  };

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'flex flex-col justify-between rounded-card border border-border bg-card p-5 shadow-card transition-all duration-150',
          isClickable && 'cursor-pointer hover:border-primary-tint-border hover:shadow-card-hover',
          className,
        ),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
        {icon && (
          <div
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded',
              tileStyles[tileColor],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-display text-[26px] font-bold tracking-tight text-text-primary">
          {value}
        </span>
        {delta && (
          <span
            className={clsx(
              'text-xs tracking-tight',
              delta.variant
                ? deltaColors[delta.variant]
                : delta.isPositive !== undefined
                  ? delta.isPositive
                    ? deltaColors.success
                    : deltaColors.danger
                  : deltaColors.neutral,
            )}
          >
            {delta.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatsCard;

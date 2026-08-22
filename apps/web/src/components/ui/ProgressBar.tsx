'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  className?: string;
}

/**
 * Reusable ProgressBar primitive for leave balances, working hours, and stats.
 */
export function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);

  const sizeStyles = {
    sm: 'h-1.5 rounded-sm',
    md: 'h-2 rounded',
    lg: 'h-3 rounded-container',
  };

  const isPredefinedColor = [
    'primary',
    'success',
    'warning',
    'danger',
    'secondary',
  ].includes(color);

  const colorStyles: Record<string, string> = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    secondary: 'bg-secondary',
  };

  return (
    <div className={twMerge('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-text-primary">{label}</span>}
          {showValue && (
            <span className="text-text-secondary">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full overflow-hidden bg-hairline',
          sizeStyles[size],
        )}
      >
        <div
          style={{
            width: `${percentage}%`,
            backgroundColor: !isPredefinedColor ? color : undefined,
          }}
          className={clsx(
            'h-full transition-all duration-300 ease-out rounded-sm',
            isPredefinedColor && colorStyles[color],
          )}
        />
      </div>
    </div>
  );
}

export default ProgressBar;

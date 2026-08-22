'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable EmptyState primitive with icon tile, title, message, and call-to-action button.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center p-8 text-center rounded-card border border-dashed border-border bg-card',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={action.onClick}
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default EmptyState;

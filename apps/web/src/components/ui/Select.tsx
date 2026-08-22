'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  options?: SelectOption[];
}

/**
 * Reusable Select dropdown primitive conforming to the Dayflow Design System.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      required,
      id,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 text-[13px] font-semibold text-text-primary"
          >
            {label}
            {required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            required={required}
            className={twMerge(
              clsx(
                'w-full appearance-none rounded bg-card px-3 py-2 pr-9 text-sm text-text-primary',
                'border transition-colors duration-150',
                hasError
                  ? 'border-danger focus:outline-danger'
                  : 'border-border focus:outline-primary',
                disabled && 'cursor-not-allowed bg-background text-text-secondary opacity-75',
                className,
              ),
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute right-3 flex items-center text-text-muted">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {errorMessage ? (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';

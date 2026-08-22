'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
}

/**
 * Reusable Textarea primitive with label, error message, and custom focus ring.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      required,
      id,
      className,
      disabled,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 text-[13px] font-semibold text-text-primary"
          >
            {label}
            {required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          required={required}
          className={twMerge(
            clsx(
              'w-full rounded bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled',
              'border transition-colors duration-150',
              hasError
                ? 'border-danger focus:outline-danger'
                : 'border-border focus:outline-primary',
              disabled && 'cursor-not-allowed bg-background text-text-secondary opacity-75',
              className,
            ),
          )}
          {...props}
        />
        {errorMessage ? (
          <p className="mt-1 text-xs text-danger">{errorMessage}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

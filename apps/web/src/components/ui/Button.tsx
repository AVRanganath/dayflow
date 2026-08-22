'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Reusable Button primitive adhering to the Dayflow Design System.
 * Radius: 4px, high-contrast states, loading spinner support.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-btn select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      secondary: 'bg-secondary text-white hover:bg-[#01686D] shadow-sm',
      outline:
        'bg-transparent text-primary border border-primary hover:bg-primary-tint',
      ghost: 'bg-transparent text-text-primary hover:bg-primary-tint hover:text-primary',
      danger: 'bg-danger text-white hover:bg-[#DC2626] shadow-sm',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-2.5 py-1 text-xs gap-1.5 h-7',
      md: 'px-3.5 py-2 text-sm gap-2 h-9',
      lg: 'px-5 py-2.5 text-base gap-2.5 h-11 font-semibold',
      icon: 'p-2 h-9 w-9 justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            className,
          ),
        )}
        {...props}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

'use client';

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '../../components/ui/Input';

export interface PasswordFieldProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggleText?: boolean;
}

/**
 * Reusable password input with show/hide toggle button.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ showToggleText = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <>
                <EyeOff className="h-4 w-4" />
                {showToggleText && <span>Hide</span>}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                {showToggleText && <span>Show</span>}
              </>
            )}
          </button>
        }
      />
    );
  },
);

PasswordField.displayName = 'PasswordField';

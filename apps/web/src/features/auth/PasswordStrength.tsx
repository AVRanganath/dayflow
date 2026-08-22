'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface PasswordStrengthProps {
  password?: string;
}

interface StrengthResult {
  score: number;
  label: string;
  colorClass: string;
  barColorClass: string;
}

function calculateStrength(pass: string): StrengthResult {
  if (!pass) {
    return {
      score: 0,
      label: '',
      colorClass: 'text-text-muted',
      barColorClass: 'bg-border',
    };
  }

  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return {
        score: 1,
        label: 'Weak password',
        colorClass: 'text-danger',
        barColorClass: 'bg-danger',
      };
    case 2:
      return {
        score: 2,
        label: 'Fair password',
        colorClass: 'text-warning',
        barColorClass: 'bg-warning',
      };
    case 3:
      return {
        score: 3,
        label: 'Good password',
        colorClass: 'text-success',
        barColorClass: 'bg-success',
      };
    case 4:
      return {
        score: 4,
        label: 'Strong password',
        colorClass: 'text-success',
        barColorClass: 'bg-success',
      };
    default:
      return {
        score: 0,
        label: 'Too short',
        colorClass: 'text-danger',
        barColorClass: 'bg-danger',
      };
  }
}

/**
 * 4-bar password strength meter matching the Dayflow UI design spec.
 */
export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const { score, label, colorClass, barColorClass } = calculateStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className="flex h-1 w-full gap-1">
        {[1, 2, 3, 4].map((barIndex) => (
          <div
            key={barIndex}
            className={clsx(
              'h-full flex-1 rounded-[2px] transition-colors duration-200',
              barIndex <= score ? barColorClass : 'bg-border',
            )}
          />
        ))}
      </div>
      {label && (
        <p className={clsx('text-[11px] font-medium transition-colors duration-150', colorClass)}>
          {label}
        </p>
      )}
    </div>
  );
}

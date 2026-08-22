'use client';

import React from 'react';
import { ChangePasswordForm } from '../../../features/auth';

/**
 * Change Password Page — Forced first-login or voluntary password updates (ADR-012).
 */
export default function ChangePasswordPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Wordmark Display */}
      <div className="md:hidden mb-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-text-primary">
          Day<span className="text-secondary">flow</span>
        </h2>
        <p className="font-marker text-base text-primary">Every workday, perfectly aligned.</p>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-[26px] font-bold text-text-primary">
          Update your password
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Please update your temporary password to secure your account
        </p>
      </div>

      {/* Form */}
      <ChangePasswordForm />
    </div>
  );
}

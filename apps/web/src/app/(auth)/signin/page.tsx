'use client';

import React from 'react';
import Link from 'next/link';
import { SigninForm } from '../../../features/auth';

/**
 * Sign In Page (PAGE 2) — Email / Login ID credential authentication.
 */
export default function SigninPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Wordmark Display (hidden on desktop where left panel is visible) */}
      <div className="md:hidden mb-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-text-primary">
          Day<span className="text-secondary">flow</span>
        </h2>
        <p className="font-marker text-base text-primary">Every workday, perfectly aligned.</p>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-[26px] font-bold text-text-primary">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to your Dayflow account to continue
        </p>
      </div>

      {/* Form */}
      <SigninForm />

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-hairline text-center text-xs text-text-secondary">
        <span>Setting up a new organization? </span>
        <Link
          href="/signup"
          className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
        >
          Company Onboarding
        </Link>
      </div>
    </div>
  );
}

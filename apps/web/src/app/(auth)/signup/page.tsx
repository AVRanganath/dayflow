'use client';

import React from 'react';
import Link from 'next/link';
import { OnboardingForm } from '../../../features/auth';

/**
 * Sign Up Page (PAGE 1) — Initial Company and Administrator Onboarding (ADR-012).
 */
export default function SignupPage() {
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
          Set up your company
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create your primary organization and administrator account
        </p>
      </div>

      {/* Form */}
      <OnboardingForm />

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-hairline text-center text-xs text-text-secondary flex flex-col gap-2">
        <div>
          <span>Already have an account? </span>
          <Link
            href="/signin"
            className="font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
        <p className="text-[11px] text-text-muted">
          By continuing, you agree to Dayflow&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

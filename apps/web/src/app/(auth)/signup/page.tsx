'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Input } from '../../../components/ui';

export default function SignupPlaceholderPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-tint to-white p-4">
      <div className="w-full max-w-md rounded-container border border-border bg-card p-8 shadow-auth">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">
            Day<span className="text-secondary">flow</span>
          </h1>
          <p className="mt-1 font-marker text-lg text-primary">Every workday, perfectly aligned.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Company Name" placeholder="Odoo India" required />
          <Input label="Admin Email" type="email" placeholder="admin@dayflow.com" required />
          <Input label="Password" type="password" placeholder="••••••••" required />
          <Button variant="primary" className="w-full mt-2">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          <span>Already have an account? </span>
          <Link href="/signin" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

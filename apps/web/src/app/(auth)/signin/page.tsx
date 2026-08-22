'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Input } from '../../../components/ui';

export default function SigninPlaceholderPage() {
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
          <Input
            label="Email or Login ID"
            placeholder="admin@dayflow.com or OIJODO20220001"
            required
          />
          <Input label="Password" type="password" placeholder="••••••••" required />
          <Button variant="primary" className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          <span>Don&apos;t have an account? </span>
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

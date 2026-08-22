'use client';

import React from 'react';
import { RequireAuth } from '../../lib/auth/route-guard';
import { AppShell } from '../../components/layout/AppShell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

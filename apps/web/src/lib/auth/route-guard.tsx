'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import type { Role } from '@dayflow/shared';

export interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Route guard component that restricts access to authenticated users.
 * Redirects to /signin if unauthenticated after loading finishes.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-text-secondary">Loading Dayflow...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to guard role-specific UI elements or pages (e.g. ADMIN or HR only).
 */
export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || !roles.includes(user.role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <h3 className="text-lg font-bold text-text-primary">Access Restricted</h3>
        <p className="mt-1 text-sm text-text-secondary">
          You do not have permission to view this content.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../../../../../components/ui';

/**
 * "All caught up!" empty state for the approvals page (PAGE 9) — shown when there are
 * no pending leave requests. Thin wrapper over the S10 EmptyState primitive.
 */
export function ApprovalsEmptyState() {
  return (
    <EmptyState
      icon={<CheckCircle2 className="h-7 w-7" />}
      title="All caught up!"
      description="No pending leave requests to review right now."
    />
  );
}

export default ApprovalsEmptyState;

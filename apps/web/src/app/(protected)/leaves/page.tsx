'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { LeaveType } from '@dayflow/shared';
import { Button, ProgressBar, useToast } from '../../../components/ui';
import {
  getMyBalance,
  getMyLeaves,
  type LeaveBalanceSummary,
  type MyLeaveRow,
} from '../../../lib/api/leaves';
import { ApiError } from '../../../lib/api/types';
import { ApplyLeaveModal } from './_components/apply-leave-modal';
import { LeaveHistoryTable } from './_components/leave-history-table';

/** Balance card config per ADR-004 (Paid blue, Sick orange, Casual green). */
const BALANCE_CARDS: { type: LeaveType; label: string; color: string }[] = [
  { type: 'PAID', label: 'Paid Leave', color: '#017E84' },
  { type: 'SICK', label: 'Sick Leave', color: '#F59E0B' },
  { type: 'CASUAL', label: 'Casual Leave', color: '#10B981' },
];

/**
 * Leave Management page (PAGE 8). Shows tracked balance cards (ADR-004), an Apply for
 * Leave action, and the employee's leave history. Data from the S07 leave endpoints.
 */
export default function LeavesPage() {
  const toast = useToast();
  const [balance, setBalance] = useState<LeaveBalanceSummary>({});
  const [leaves, setLeaves] = useState<MyLeaveRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bal, history] = await Promise.all([getMyBalance(), getMyLeaves()]);
      setBalance(bal);
      setLeaves(history.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load leave data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo(
    () =>
      BALANCE_CARDS.map((card) => {
        const line = balance[card.type];
        return { ...card, line };
      }),
    [balance],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Leave Management</h1>
          <p className="text-sm text-text-secondary">Track your balances and request time off.</p>
        </div>
        <Button
          size="lg"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setModalOpen(true)}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const allocated = card.line?.allocated ?? 0;
          const used = card.line?.used ?? 0;
          const remaining = card.line?.remaining ?? 0;
          return (
            <div
              key={card.type}
              className="rounded-card border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text-primary">{card.label}</span>
                <span className="text-lg font-bold" style={{ color: card.color }}>
                  {remaining}
                  <span className="text-xs font-normal text-text-muted"> / {allocated}</span>
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={used} max={allocated || 1} color={card.color} />
              </div>
              <p className="mt-2 text-[11px] text-text-muted">{used} used this year</p>
            </div>
          );
        })}

        {/* Unpaid = unlimited (ADR-004) */}
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-text-primary">Unpaid Leave</span>
            <span className="text-lg font-bold text-text-muted">∞</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={0} max={1} color="#98A0A8" />
          </div>
          <p className="mt-2 text-[11px] text-text-muted">Unlimited</p>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 font-display text-sm font-bold text-text-primary">Leave History</h2>
        <LeaveHistoryTable rows={leaves} isLoading={isLoading} />
      </div>

      <ApplyLeaveModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onApplied={load}
      />
    </div>
  );
}

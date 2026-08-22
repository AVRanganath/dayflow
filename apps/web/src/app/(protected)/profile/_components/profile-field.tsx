'use client';

import React from 'react';
import { Lock } from 'lucide-react';

/**
 * A single labelled profile field — either an editable input (delegated to the
 * caller via `children`) or a locked, read-only value box (lock icon + gray
 * background + `disabled`), matching PAGE 5's Private/Job-details anatomy.
 */
export interface ReadonlyFieldProps {
  label: string;
  /** The display value; `null`/empty renders an em dash. */
  value?: React.ReactNode;
  /** Show the lock icon + gray box (restricted / non-self-editable field). */
  locked?: boolean;
  /** Span both columns of the two-column grid (e.g. Address). */
  full?: boolean;
}

/**
 * Read-only field: a bordered, gray value box. When `locked`, a lock icon sits
 * beside the label and the box is styled as `disabled` (ADR-015 restricted
 * fields: IDs, PAN/UAN, Emp Code, job & salary).
 */
export function ReadonlyField({ label, value, locked = false, full = false }: ReadonlyFieldProps) {
  const shown =
    value === null || value === undefined || value === '' ? (
      <span className="text-text-muted">—</span>
    ) : (
      value
    );

  return (
    <div className={full ? 'col-span-full flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
      <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">
        {label}
        {locked && <Lock className="h-3 w-3 text-text-muted" aria-hidden />}
      </label>
      <div
        aria-disabled
        className="rounded border border-border bg-background px-3 py-2 text-sm text-text-secondary"
      >
        {shown}
      </div>
    </div>
  );
}

/**
 * A generic labelled wrapper for an editable control (Input/Select/Textarea).
 * The wrapped control renders its own label already; this is used where a plain
 * container with grid placement is needed.
 */
export function FieldGroup({
  full = false,
  children,
}: {
  full?: boolean;
  children: React.ReactNode;
}) {
  return <div className={full ? 'col-span-full' : ''}>{children}</div>;
}

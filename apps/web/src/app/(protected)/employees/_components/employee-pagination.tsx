'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface EmployeePaginationProps {
  /** 1-based index of the page currently shown. */
  pageIndex: number;
  /** Number of rows on the current page. */
  pageCount: number;
  /** Rows per page (`limit`). */
  pageSize: number;
  /** Whether a next page exists (`meta.nextCursor != null`). */
  hasNext: boolean;
  /** Whether a previous page exists (we are past page 1). */
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Cursor-based pagination (ADR-010) wired to `meta.nextCursor`. Cursor lists
 * have no total count, so this shows "Showing X–Y" for the current window plus
 * Prev/Next controls gated on the presence of a cursor / prior page.
 */
export function EmployeePagination({
  pageIndex,
  pageCount,
  pageSize,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
}: EmployeePaginationProps) {
  if (pageCount === 0) return null;

  const start = (pageIndex - 1) * pageSize + 1;
  const end = start + pageCount - 1;

  return (
    <div className="flex items-center justify-between rounded-card border border-border bg-card px-4 py-3 shadow-card">
      <div className="text-[13px] text-text-secondary">
        Showing <span className="font-medium text-text-primary">{start}</span>–
        <span className="font-medium text-text-primary">{end}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous page"
          className="inline-flex h-8 items-center gap-1 rounded border border-border bg-card px-3 text-[13px] text-text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-60"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next page"
          className="inline-flex h-8 items-center gap-1 rounded border border-border bg-card px-3 text-[13px] text-text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-60"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default EmployeePagination;

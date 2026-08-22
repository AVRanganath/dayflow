'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  pagination?: PaginationProps;
  className?: string;
  zebra?: boolean;
}

/**
 * Reusable DataTable primitive featuring zebra striping, custom column renderers,
 * hover states, responsive scrolling, and an integrated pagination footer.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  onRowClick,
  pagination,
  className,
  zebra = true,
}: DataTableProps<T>) {
  const getRowKey = (item: T, index: number) => {
    if (keyExtractor) return keyExtractor(item, index);
    const candidate = (item as Record<string, unknown>)['id'];
    return (typeof candidate === 'string' || typeof candidate === 'number')
      ? candidate
      : index;
  };

  return (
    <div
      className={twMerge(
        'w-full overflow-hidden rounded-card border border-border bg-card shadow-card',
        className,
      )}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-[#F5F6F7]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary',
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                        ? 'text-right'
                        : 'text-left',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-text-secondary">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  {emptyState || (
                    <p className="text-sm text-text-muted">No records found</p>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isClickable = Boolean(onRowClick);
                return (
                  <tr
                    key={getRowKey(row, idx)}
                    onClick={() => onRowClick?.(row)}
                    className={clsx(
                      'transition-colors duration-100',
                      zebra && idx % 2 === 1 ? 'bg-zebra' : 'bg-card',
                      'hover:bg-[#F5F6F7]',
                      isClickable && 'cursor-pointer',
                    )}
                  >
                    {columns.map((col) => {
                      const value = (row as Record<string, unknown>)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={clsx(
                            'px-4 py-3 text-[13px] text-text-primary',
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                                ? 'text-right'
                                : 'text-left',
                            col.className,
                          )}
                        >
                          {col.render ? col.render(row, idx) : (value as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
          <div className="text-[13px] text-text-secondary">
            {pagination.totalItems !== undefined && pagination.pageSize ? (
              <span>
                Showing{' '}
                <span className="font-medium text-text-primary">
                  {Math.min(
                    (pagination.currentPage - 1) * pagination.pageSize + 1,
                    pagination.totalItems,
                  )}
                </span>{' '}
                to{' '}
                <span className="font-medium text-text-primary">
                  {Math.min(
                    pagination.currentPage * pagination.pageSize,
                    pagination.totalItems,
                  )}
                </span>{' '}
                of{' '}
                <span className="font-medium text-text-primary">
                  {pagination.totalItems}
                </span>{' '}
                results
              </span>
            ) : (
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - pagination.currentPage) <= 1,
                )
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && page - prev > 1;
                  const isActive = page === pagination.currentPage;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-1 text-xs text-text-muted">...</span>
                      )}
                      <button
                        onClick={() => pagination.onPageChange(page)}
                        className={clsx(
                          'flex h-8 min-w-[32px] items-center justify-center rounded px-2 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-white'
                            : 'border border-border bg-card text-text-primary hover:bg-background',
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-text-secondary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;

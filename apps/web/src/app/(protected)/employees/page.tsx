'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, Plus, UserPlus } from 'lucide-react';
import { Button, EmptyState } from '../../../components/ui';
import { ApiError } from '../../../lib/api/types';
import { useAuth } from '../../../lib/auth/useAuth';
import {
  listDepartments,
  listEmployees,
  type Department,
  type Employee,
} from '../../../lib/employees';
import { EmployeeFilters, type EmployeeFilterValues } from './_components/employee-filters';
import { EmployeeTable } from './_components/employee-table';
import { EmployeeCard } from './_components/employee-card';
import { EmployeePagination } from './_components/employee-pagination';

const PAGE_SIZE = 20;
const EMPTY_FILTERS: EmployeeFilterValues = {
  search: '',
  departmentId: '',
  employmentType: '',
  status: 'ALL',
};

/**
 * PAGE 6 — Employee Directory (**ADMIN/HR only**, ADR-001). Top bar (title +
 * count, search, Department / Employment Type / Status filters, "Add Employee"),
 * the directory table (or card grid), and cursor pagination (ADR-010).
 *
 * Role-gated in the route itself: non-management users are redirected to
 * `/dashboard` (the sidebar already hides the nav item; the API is the final
 * gate). Search + filters reset the cursor.
 */
export default function EmployeesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const isManagement = user?.role === 'ADMIN' || user?.role === 'HR';

  const [filters, setFilters] = useState<EmployeeFilterValues>(EMPTY_FILTERS);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'grid'>('table');

  // Cursor stack: index 0 = first page (no cursor). `cursors[i]` is the cursor
  // that produced page i. `nextCursor` from meta drives forward paging.
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Redirect non-management users away from the directory (fail-fast; API is the
  // final gate).
  useEffect(() => {
    if (!authLoading && user && !isManagement) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, isManagement, router]);

  // Load departments once (for the filter + department names).
  useEffect(() => {
    if (!isManagement) return;
    listDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [isManagement]);

  // Track the currently applied cursor so filter changes can reset paging.
  const activeCursor = cursorStack[pageIndex];

  const fetchPage = useCallback(
    async (cursor: string | undefined) => {
      setLoading(true);
      setError(null);
      try {
        const page = await listEmployees({
          search: filters.search || undefined,
          departmentId: filters.departmentId || undefined,
          employmentType: filters.employmentType || undefined,
          cursor,
          limit: PAGE_SIZE,
        });
        setRows(page.data);
        setNextCursor(page.meta.nextCursor);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load employees');
        setRows([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [filters.search, filters.departmentId, filters.employmentType],
  );

  // Refetch whenever the applied cursor changes.
  useEffect(() => {
    if (!isManagement) return;
    void fetchPage(activeCursor);
  }, [isManagement, activeCursor, fetchPage]);

  // A filter change resets paging back to the first page. We reset the cursor
  // stack; the effect above then refetches.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCursorStack([undefined]);
    setPageIndex(0);
  }, [filters.search, filters.departmentId, filters.employmentType]);

  const handleNext = useCallback(() => {
    if (nextCursor == null) return;
    setCursorStack((prev) => {
      const next = prev.slice(0, pageIndex + 1);
      next.push(nextCursor);
      return next;
    });
    setPageIndex((i) => i + 1);
  }, [nextCursor, pageIndex]);

  const handlePrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  // Status is applied client-side over `user.isActive` (no server filter).
  const visibleRows = useMemo(() => {
    if (filters.status === 'ALL') return rows;
    const wantActive = filters.status === 'ACTIVE';
    return rows.filter((r) => r.user.isActive === wantActive);
  }, [rows, filters.status]);

  if (authLoading || (user && !isManagement)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-lg font-bold text-text-primary">Employees</h1>
          {visibleRows.length > 0 && (
            <span className="rounded-pill bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
              {visibleRows.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-border">
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setView('table')}
              className={
                view === 'table'
                  ? 'flex h-9 w-9 items-center justify-center bg-primary-tint text-primary'
                  : 'flex h-9 w-9 items-center justify-center bg-card text-text-secondary hover:bg-background'
              }
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Card view"
              onClick={() => setView('grid')}
              className={
                view === 'grid'
                  ? 'flex h-9 w-9 items-center justify-center bg-primary-tint text-primary'
                  : 'flex h-9 w-9 items-center justify-center bg-card text-text-secondary hover:bg-background'
              }
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters value={filters} departments={departments} onChange={setFilters} />

      {/* Error */}
      {error && (
        <div className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && visibleRows.length === 0 && !error ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title="No employees found"
          description="Try adjusting your search or filters."
        />
      ) : view === 'table' ? (
        <EmployeeTable employees={visibleRows} departments={departments} isLoading={loading} />
      ) : loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map((e) => (
            <EmployeeCard key={e.id} employee={e} departments={departments} />
          ))}
        </div>
      )}

      {/* Pagination (cursor-based, ADR-010) */}
      {!error && (
        <EmployeePagination
          pageIndex={pageIndex + 1}
          pageCount={visibleRows.length}
          pageSize={PAGE_SIZE}
          hasNext={nextCursor != null}
          hasPrev={pageIndex > 0}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
}

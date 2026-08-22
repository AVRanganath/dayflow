/**
 * Leave module business logic (plan.md §6 — no Prisma in controllers). Implements
 * the "smart leave engine" differentiator: balance validation, overlap rejection,
 * weekend-skipping day counts, and an atomic approve (ADR-006).
 */
import type { Prisma, LeaveRequest } from '@dayflow/db';
import type {
  AllocateLeaveInput,
  ApplyLeaveInput,
  LeaveListQuery,
  LeaveType,
  PaginationQuery,
} from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import {
  BALANCE_TRACKED_LEAVE_TYPES,
  isBalanceTracked,
  type LeaveBalanceSummary,
} from './leave.types.js';
import { notifyLeaveDecision } from './leave.hooks.js';

/**
 * Counts working days (Mon–Fri) from `startDate` to `endDate` inclusive, skipping
 * Saturday/Sunday. Dates are normalized to UTC date-only components first so a
 * caller's local timezone can never shift the result by a day.
 */
export function countWorkingDays(startDate: Date, endDate: Date): number {
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  let count = 0;
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Looks up the `Employee` row for an authenticated `User.id`. Every leave action needs this. */
async function resolveEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  if (!employee) throw new NotFoundError('No employee profile is linked to this user');
  return employee.id;
}

/** Submits a new leave request (balance + overlap validated first). */
export async function applyLeave(userId: string, input: ApplyLeaveInput): Promise<LeaveRequest> {
  const employeeId = await resolveEmployeeId(userId);
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const totalDays = countWorkingDays(startDate, endDate);

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlap) {
    throw new AppError(
      409,
      'LEAVE_OVERLAP',
      'This leave request overlaps an existing pending or approved leave.',
    );
  }

  if (isBalanceTracked(input.type)) {
    const year = startDate.getUTCFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType_year: { employeeId, leaveType: input.type, year } },
    });
    const allocated = balance ? Number(balance.totalAllowed) : 0;
    const used = balance ? Number(balance.used) : 0;
    if (allocated - used < totalDays) {
      throw new AppError(
        422,
        'INSUFFICIENT_LEAVE_BALANCE',
        `Insufficient ${input.type} leave balance: ${allocated - used} day(s) remaining, ${totalDays} requested.`,
      );
    }
  }

  return prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType: input.type,
      startDate,
      endDate,
      totalDays,
      reason: input.reason,
      attachmentUrl: input.attachmentUrl ?? null,
    },
  });
}

interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
}

async function paginateLeaves(
  where: Prisma.LeaveRequestWhereInput,
  pagination: PaginationQuery,
  includeEmployee: boolean,
): Promise<PagedResult<LeaveRequest & { employee?: { firstName: string; lastName: string } }>> {
  const rows = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: pagination.limit + 1,
    ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    include: includeEmployee
      ? { employee: { select: { firstName: true, lastName: true } } }
      : undefined,
  });
  const hasMore = rows.length > pagination.limit;
  const items = hasMore ? rows.slice(0, pagination.limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? last.id : null };
}

/** Caller's own leave history, newest first. */
export async function listMyLeaves(userId: string, pagination: PaginationQuery) {
  const employeeId = await resolveEmployeeId(userId);
  return paginateLeaves({ employeeId }, pagination, false);
}

/** ADMIN/HR view of all leave requests, optionally filtered by status. */
export function listAllLeaves(query: LeaveListQuery & PaginationQuery) {
  const where: Prisma.LeaveRequestWhereInput = query.status ? { status: query.status } : {};
  return paginateLeaves(where, query, true);
}

/**
 * Approves a pending leave request. Status change + `LeaveBalance.used`
 * increment happen inside one `prisma.$transaction` (ADR-006) — the PENDING
 * check is re-run inside the transaction to avoid a double-approval race.
 */
export async function approveLeave(reviewerUserId: string, leaveId: string): Promise<LeaveRequest> {
  const reviewerId = await resolveEmployeeId(reviewerUserId);

  const updated = await prisma.$transaction(async (tx) => {
    const leave = await tx.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) throw new NotFoundError('Leave request not found');
    if (leave.status !== 'PENDING') {
      throw new AppError(409, 'LEAVE_NOT_PENDING', 'Only pending leave requests can be approved.');
    }

    const result = await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() },
    });

    if (isBalanceTracked(leave.leaveType)) {
      const year = leave.startDate.getUTCFullYear();
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year,
          },
        },
        data: { used: { increment: leave.totalDays } },
      });
    }

    return result;
  });

  notifyLeaveDecision({ employeeId: updated.employeeId, leaveId: updated.id, status: 'APPROVED' });
  return updated;
}

/** Rejects a pending leave request; `reason` is stored as `reviewerComment`. */
export async function rejectLeave(
  reviewerUserId: string,
  leaveId: string,
  reason: string,
): Promise<LeaveRequest> {
  const reviewerId = await resolveEmployeeId(reviewerUserId);

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw new NotFoundError('Leave request not found');
  if (leave.status !== 'PENDING') {
    throw new AppError(409, 'LEAVE_NOT_PENDING', 'Only pending leave requests can be rejected.');
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: 'REJECTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewerComment: reason,
    },
  });

  notifyLeaveDecision({
    employeeId: updated.employeeId,
    leaveId: updated.id,
    status: 'REJECTED',
    reason,
  });
  return updated;
}

/** `PAID`/`SICK`/`CASUAL` balance for the current year (ADR-004); `UNPAID` is unlimited, omitted here. */
export async function getMyBalance(userId: string): Promise<LeaveBalanceSummary> {
  const employeeId = await resolveEmployeeId(userId);
  return getBalanceForEmployee(employeeId);
}

async function getBalanceForEmployee(employeeId: string): Promise<LeaveBalanceSummary> {
  const year = new Date().getFullYear();
  const rows = await prisma.leaveBalance.findMany({
    where: {
      employeeId,
      year,
      leaveType: { in: BALANCE_TRACKED_LEAVE_TYPES as unknown as LeaveType[] },
    },
  });

  const summary = {} as LeaveBalanceSummary;
  for (const type of BALANCE_TRACKED_LEAVE_TYPES) {
    const row = rows.find((r) => r.leaveType === type);
    const allocated = row ? Number(row.totalAllowed) : 0;
    const used = row ? Number(row.used) : 0;
    summary[type] = { allocated, used, remaining: allocated - used };
  }
  return summary;
}

/**
 * ADMIN/HR allocation (ADR-018). Upserts the `LeaveBalance` row for
 * `[employeeId, leaveType, year]`, setting `allocated` and leaving `used`
 * untouched on update so a re-allocation never resets consumed days.
 */
export async function allocateBalance(input: AllocateLeaveInput) {
  const year = input.year ?? new Date().getFullYear();
  const balance = await prisma.leaveBalance.upsert({
    where: {
      employeeId_leaveType_year: { employeeId: input.employeeId, leaveType: input.type, year },
    },
    create: {
      employeeId: input.employeeId,
      leaveType: input.type,
      year,
      totalAllowed: input.totalAllowed,
    },
    update: { totalAllowed: input.totalAllowed },
  });

  return {
    id: balance.id,
    employeeId: balance.employeeId,
    leaveType: balance.leaveType,
    year: balance.year,
    totalAllowed: Number(balance.totalAllowed),
    used: Number(balance.used),
    remaining: Number(balance.totalAllowed) - Number(balance.used),
  };
}

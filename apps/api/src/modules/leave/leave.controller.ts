/**
 * Thin HTTP controllers for `/api/v1/leaves` (plan.md §6 — no Prisma here).
 * Parses the request with a Zod schema, delegates to `leave.service.ts`, and
 * returns the ADR-010 envelope.
 */
import type { NextFunction, Request, Response } from 'express';
import type { SuccessResponse } from '@dayflow/shared';
import { UnauthorizedError } from '../../lib/errors.js';
import type { AuthUser } from '../../middleware/auth.js';
import {
  AdminLeaveListQuerySchema,
  AllocateLeaveSchema,
  ApplyLeaveSchema,
  MyLeaveListQuerySchema,
  RejectLeaveSchema,
} from './leave.schema.js';
import * as leaveService from './leave.service.js';

/** `requireAuth` guarantees `req.user` by the time a controller runs. */
function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

function ok<T>(res: Response, data: T, status = 200): void {
  const body: SuccessResponse<T> = { success: true, data };
  res.status(status).json(body);
}

/** `POST /leaves` — apply for leave; optional `file` (multipart) or `attachmentUrl` (JSON). */
export async function apply(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(req);
    const parsed = ApplyLeaveSchema.parse(req.body);
    const input = req.file
      ? { ...parsed, attachmentUrl: `/uploads/leave-attachments/${req.file.filename}` }
      : parsed;
    const leave = await leaveService.applyLeave(user.id, input);
    ok(res, leave, 201);
  } catch (err) {
    next(err);
  }
}

/** `GET /leaves/me` — caller's own leave history. */
export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(req);
    const pagination = MyLeaveListQuerySchema.parse(req.query);
    const { items, nextCursor } = await leaveService.listMyLeaves(user.id, pagination);
    res
      .status(200)
      .json({ success: true, data: items, meta: { nextCursor } } satisfies SuccessResponse<
        typeof items
      >);
  } catch (err) {
    next(err);
  }
}

/** `GET /leaves` — ADMIN/HR view of all leave requests. */
export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = AdminLeaveListQuerySchema.parse(req.query);
    const { items, nextCursor } = await leaveService.listAllLeaves(query);
    res
      .status(200)
      .json({ success: true, data: items, meta: { nextCursor } } satisfies SuccessResponse<
        typeof items
      >);
  } catch (err) {
    next(err);
  }
}

/** `PATCH /leaves/:id/approve` — ADMIN/HR. */
export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(req);
    const leave = await leaveService.approveLeave(user.id, req.params.id as string);
    ok(res, leave);
  } catch (err) {
    next(err);
  }
}

/** `PATCH /leaves/:id/reject` — ADMIN/HR, requires `{ reason }`. */
export async function reject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(req);
    const { reason } = RejectLeaveSchema.parse(req.body);
    const leave = await leaveService.rejectLeave(user.id, req.params.id as string, reason);
    ok(res, leave);
  } catch (err) {
    next(err);
  }
}

/** `GET /leaves/balance/me` — current-year balance for PAID/SICK/CASUAL. */
export async function getMyBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(req);
    const balance = await leaveService.getMyBalance(user.id);
    ok(res, balance);
  } catch (err) {
    next(err);
  }
}

/** `POST /leaves/allocations` — ADMIN/HR (ADR-018). */
export async function allocate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = AllocateLeaveSchema.parse(req.body);
    const balance = await leaveService.allocateBalance(input);
    ok(res, balance, 201);
  } catch (err) {
    next(err);
  }
}

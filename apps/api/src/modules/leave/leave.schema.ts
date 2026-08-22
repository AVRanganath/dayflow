/**
 * Zod validation for the leave module. Every schema here is re-exported straight
 * from `@dayflow/shared` (plan.md §6 — never inline-define a schema that belongs
 * in the shared package); this file only combines them for list-query endpoints
 * that need pagination merged in.
 */
import { LeaveListQuerySchema, PaginationQuerySchema } from '@dayflow/shared';

export {
  ApplyLeaveSchema,
  RejectLeaveSchema,
  ApproveLeaveSchema,
  AllocateLeaveSchema,
  LeaveListQuerySchema,
} from '@dayflow/shared';

/** `GET /leaves/me` query: cursor pagination only. */
export const MyLeaveListQuerySchema = PaginationQuerySchema;

/** `GET /leaves` query: optional `status` filter + cursor pagination. */
export const AdminLeaveListQuerySchema = LeaveListQuerySchema.merge(PaginationQuerySchema);

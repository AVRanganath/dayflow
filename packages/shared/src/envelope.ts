/**
 * @dayflow/shared — the fixed API response envelope (ADR-010).
 *
 * Every endpoint returns either a {@link SuccessResponse} or an {@link ErrorResponse}.
 * No endpoint returns a raw array or bare object.
 */
import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from './constants.js';

/** Pagination / metadata attached to list responses. */
export interface ResponseMeta {
  nextCursor?: string | null;
  total?: number;
  limit?: number;
}

/** Successful response envelope. */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

/** Error body shape. `code` is a stable machine string (e.g. `VALIDATION_ERROR`). */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/** Error response envelope. */
export interface ErrorResponse {
  success: false;
  error: ApiErrorBody;
}

/** Either arm of the envelope. */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Query params for cursor-based list endpoints. `limit` is coerced from the query
 * string, defaults to {@link DEFAULT_LIMIT}, and is capped at {@link MAX_LIMIT}.
 */
export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

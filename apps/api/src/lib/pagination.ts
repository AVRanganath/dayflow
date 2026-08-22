/**
 * Cursor-pagination helper (ADR-010). Cursor is the last row's `id` (opaque to
 * clients). Fetch `limit + 1` rows to detect whether another page exists, then
 * slice back to `limit` and expose the next cursor via `meta.nextCursor`.
 */
import type { ResponseMeta } from '@dayflow/shared';

/** A row that can be paginated by its string `id`. */
interface HasId {
  id: string;
}

/** Prisma `skip`/`take`/`cursor` args to spread into a `findMany` call. */
export interface CursorArgs {
  take: number;
  skip?: number;
  cursor?: { id: string };
}

/**
 * Build the Prisma `take`/`skip`/`cursor` fragment for a forward page. Requests
 * one extra row so {@link buildPage} can compute `nextCursor`.
 *
 * @param limit - Page size (already validated/capped upstream).
 * @param cursor - Last-seen id from the previous page, if any.
 */
export function cursorArgs(limit: number, cursor?: string): CursorArgs {
  const take = limit + 1;
  return cursor ? { take, skip: 1, cursor: { id: cursor } } : { take };
}

/**
 * Trim the over-fetched result to `limit` rows and derive the pagination meta.
 *
 * @param rows - Rows returned by `findMany` (may contain the extra probe row).
 * @param limit - The requested page size.
 * @returns The page `data` and its `meta` (`nextCursor`, `limit`).
 */
export function buildPage<T extends HasId>(
  rows: T[],
  limit: number,
): { data: T[]; meta: ResponseMeta } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;
  return { data, meta: { nextCursor, limit } };
}

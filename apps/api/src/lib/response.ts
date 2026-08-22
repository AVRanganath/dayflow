/**
 * Response envelope helper (ADR-010). Every controller sends its payload through
 * `sendSuccess` so the wire shape stays `{ success:true, data, meta? }`. Errors go
 * through the global error middleware instead.
 */
import type { Response } from 'express';
import type { ResponseMeta, SuccessResponse } from '@dayflow/shared';

/**
 * Writes a standard success envelope.
 * @param res - The Express response.
 * @param data - The payload placed under `data`.
 * @param status - HTTP status code (default 200).
 * @param meta - Optional pagination/metadata block.
 */
export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: ResponseMeta): void {
  const body: SuccessResponse<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(status).json(body);
}

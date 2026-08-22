/**
 * HTTP response + async helpers shared by feature controllers.
 *
 * `sendSuccess` writes the fixed success envelope (ADR-010) so no controller
 * hand-builds `{ success, data, meta }`. `asyncHandler` wraps an async route
 * handler so a rejected promise is forwarded to the global error middleware
 * (Express 4 does not catch async throws on its own).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ResponseMeta, SuccessResponse } from '@dayflow/shared';

/**
 * Write the standard success envelope.
 *
 * @param res - Express response.
 * @param data - Payload placed under `data`.
 * @param status - HTTP status code (default 200).
 * @param meta - Optional pagination/metadata block.
 */
export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: ResponseMeta): void {
  const body: SuccessResponse<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(status).json(body);
}

/** Signature of an async Express handler that `asyncHandler` can wrap. */
type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wrap an async route handler so any thrown/rejected error reaches the global
 * error handler via `next(err)`.
 */
export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

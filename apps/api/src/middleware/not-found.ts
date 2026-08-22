/**
 * Catch-all for unmatched routes. Mounted after the versioned router, before the
 * global error handler.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '@dayflow/shared';

export function notFound(req: Request, res: Response, _next: NextFunction): void {
  const body: ErrorResponse = {
    success: false,
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

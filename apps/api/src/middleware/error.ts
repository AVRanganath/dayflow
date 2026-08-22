/**
 * The single global error handler (ADR-010). Every thrown error — `AppError`,
 * `ZodError`, or anything unexpected — is rendered as the standard envelope here.
 * Must be mounted last, after all routes and `notFound`.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ErrorResponse } from '@dayflow/shared';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten() },
    };
    res.status(400).json(body);
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  const body: ErrorResponse = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  };
  res.status(500).json(body);
}

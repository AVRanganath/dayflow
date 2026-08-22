import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from './error.js';
import { AppError } from '../lib/errors.js';
import { ZodError, ZodIssue } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

vi.mock('../lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
  }
}));

describe('Global Error Handler', () => {
  it('handles AppError and sends standard envelope', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Custom not found', { extra: 1 });
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Custom not found',
        details: { extra: 1 },
      },
    });
  });

  it('handles ZodError and sends VALIDATION_ERROR envelope', () => {
    const issues: ZodIssue[] = [
      { code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string, received number' }
    ];
    const err = new ZodError(issues);
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      })
    }));
  });

  it('handles unknown errors, logs them, and sends 500 INTERNAL_ERROR', () => {
    const err = new Error('Database goes boom');
    const req = { id: 'req-123' } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith({ err, requestId: 'req-123' }, 'Unhandled error');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });
});

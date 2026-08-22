import { describe, it, expect, vi } from 'vitest';
import { notFound } from './not-found.js';
import type { Request, Response, NextFunction } from 'express';

describe('Not Found Middleware', () => {
  it('returns 404 response with NOT_FOUND error code', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/unknown',
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/v1/unknown' },
    });
  });
});

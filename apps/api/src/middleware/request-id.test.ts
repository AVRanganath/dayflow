import { describe, it, expect, vi } from 'vitest';
import { requestId } from './request-id.js';
import type { Request, Response, NextFunction } from 'express';

describe('Request ID Middleware', () => {
  it('assigns a UUID to req.id and sets X-Request-Id header', () => {
    const req = {} as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requestId(req, res, next);

    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(30); // It's a UUID
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledOnce();
  });
});

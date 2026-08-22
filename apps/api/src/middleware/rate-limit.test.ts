import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from './rate-limit.js';
import { redis } from '../lib/redis.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../lib/redis.js', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  }
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    warn: vi.fn(),
  }
}));

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request and sets headers on first request', async () => {
    vi.mocked(redis.incr).mockResolvedValueOnce(1);
    vi.mocked(redis.ttl).mockResolvedValueOnce(60);

    const middleware = rateLimit({ windowSeconds: 60, max: 10 });
    const req = { baseUrl: '/api', path: '/test', ip: '127.0.0.1' } as Request;
    const res = {
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:/api/test:127.0.0.1');
    expect(redis.expire).toHaveBeenCalledWith('ratelimit:/api/test:127.0.0.1', 60);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows request but does not set expire on subsequent requests', async () => {
    vi.mocked(redis.incr).mockResolvedValueOnce(5); // 5th request
    vi.mocked(redis.ttl).mockResolvedValueOnce(30);

    const middleware = rateLimit({ windowSeconds: 60, max: 10 });
    const req = { baseUrl: '/api', path: '/test', ip: '127.0.0.1' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(redis.incr).toHaveBeenCalled();
    expect(redis.expire).not.toHaveBeenCalled(); // only called when count === 1
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks request when over limit', async () => {
    vi.mocked(redis.incr).mockResolvedValueOnce(11);
    vi.mocked(redis.ttl).mockResolvedValueOnce(10);

    const middleware = rateLimit({ windowSeconds: 60, max: 10 });
    const req = { baseUrl: '/api', path: '/test', ip: '127.0.0.1' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0); // Math.max(10 - 11, 0)
    
    // next should be called with AppError RATE_LIMITED
    expect(next).toHaveBeenCalledOnce();
    const errArg = vi.mocked(next).mock.calls[0]![0];
    expect(errArg).toBeInstanceOf(AppError);
    if (errArg instanceof AppError) {
      expect(errArg.statusCode).toBe(429);
      expect(errArg.code).toBe('RATE_LIMITED');
    }
  });

  it('fails open if redis throws an error', async () => {
    vi.mocked(redis.incr).mockRejectedValueOnce(new Error('Redis down'));

    const middleware = rateLimit({ windowSeconds: 60, max: 10 });
    const req = { baseUrl: '/api', path: '/test', ip: '127.0.0.1', id: 'req-1' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-1' }),
      'rate limiter unavailable — allowing request (fail-open)'
    );
    expect(next).toHaveBeenCalledWith(); // Allowed to continue
  });
});

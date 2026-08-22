/**
 * Redis-backed fixed-window rate limiter, keyed by IP + route. Sets
 * `X-RateLimit-*` headers per `docs/API.md`. S04 applies a tighter instance to the
 * auth routes; other routers may use the default.
 */
import type { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export interface RateLimitOptions {
  /** Window size in seconds. */
  windowSeconds: number;
  /** Max requests allowed per window. */
  max: number;
}

/**
 * Builds a rate-limit middleware for the given window/max, backed by Redis.
 * Fails open: Express 4 does not forward a rejected async-middleware promise to
 * `errorHandler`, so an uncaught Redis error here would hang every request. If
 * Redis is unavailable, log a warning and let the request through instead.
 */
export function rateLimit({ windowSeconds, max }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `ratelimit:${req.baseUrl}${req.path}:${req.ip}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);
      const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(max - count, 0));
      res.setHeader('X-RateLimit-Reset', resetAt);

      if (count > max) {
        next(new AppError(429, 'RATE_LIMITED', 'Too many requests — please try again later.'));
        return;
      }

      next();
    } catch (err) {
      logger.warn(
        { err, requestId: req.id },
        'rate limiter unavailable — allowing request (fail-open)',
      );
      next();
    }
  };
}

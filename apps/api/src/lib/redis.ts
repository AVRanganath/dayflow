/**
 * Single shared Redis client (ioredis), used for rate limiting now and refresh-token
 * blacklisting / SSE pub-sub in later sessions (S04, S09).
 */
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err: Error) => logger.error({ err }, 'Redis client error'));
redis.on('connect', () => logger.info('Redis connected'));

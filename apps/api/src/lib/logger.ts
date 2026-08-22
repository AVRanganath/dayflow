/**
 * Shared structured logger (pino). Import `logger` instead of using `console.*`.
 */
import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

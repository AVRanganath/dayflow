/**
 * Express app assembly: security headers, CORS, body parsing, request id/logging,
 * the versioned API router, then `notFound` and the global error handler (last).
 * No `listen()` here — see `server.ts`.
 */
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { API_BASE } from '@dayflow/shared';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestId } from './middleware/request-id.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error.js';
import { rateLimit } from './middleware/rate-limit.js';
import { router } from './routes/index.js';

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestId);
app.use(pinoHttp({ logger }));

/** Default API-wide limit; S04 applies a tighter instance to auth routes. */
app.use(API_BASE, rateLimit({ windowSeconds: 60, max: 100 }), router);

app.use(notFound);
app.use(errorHandler);

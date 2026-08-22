/**
 * Process entry point: boots Redis, starts the HTTP server, and wires graceful
 * shutdown. `app.ts` owns Express wiring; this file owns the process lifecycle.
 */
import { env } from './config/env.js';
import { app } from './app.js';
import { logger } from './lib/logger.js';
import { redis } from './lib/redis.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Dayflow API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down`);
  server.close(() => logger.info('HTTP server closed'));
  await redis.quit();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

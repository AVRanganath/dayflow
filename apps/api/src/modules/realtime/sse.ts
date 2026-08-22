/**
 * Server-Sent Events handler for `GET /api/v1/events` (ADR-009).
 *
 * One long-lived response per authenticated client, fed by the user's Redis
 * channel. Comment frames (`: ping`) keep proxies from timing the connection out.
 */
import type { Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { subscribeUser, type RealtimeEvent } from './pubsub.js';

/** Heartbeat interval — comfortably under the usual 60s proxy idle timeout. */
const HEARTBEAT_MS = 25_000;

/**
 * Holds the response open as an SSE stream for `req.user`, forwarding every
 * event published to that user's channel until the client disconnects.
 */
export function streamEvents(req: Request, res: Response): void {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Tells nginx and friends not to buffer the stream.
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  res.flushHeaders?.();

  const unsubscribe = subscribeUser(userId, (event: RealtimeEvent) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    logger.debug({ userId }, 'SSE client disconnected');
  });

  logger.debug({ userId }, 'SSE client connected');
}

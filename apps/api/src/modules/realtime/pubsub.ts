/**
 * Redis pub/sub transport behind the SSE stream (ADR-009).
 *
 * Publishing goes through the shared client; subscribing needs its own
 * connection because a Redis connection in subscribe mode refuses ordinary
 * commands. Routing events through Redis (rather than an in-process emitter) is
 * what makes SSE work across horizontally-scaled API instances: an event
 * published on instance A reaches a client connected to instance B.
 */
import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';

/** Channel pattern every user channel matches. */
const USER_CHANNEL_PATTERN = 'events:user:*';

/** An event delivered to one user's SSE stream. */
export interface RealtimeEvent {
  /** Event name, e.g. `LEAVE_APPROVED` — clients switch on this. */
  type: string;
  /** Arbitrary JSON payload for the event. */
  payload: Record<string, unknown>;
  /** ISO timestamp, set at publish time. */
  at: string;
}

/** A listener registered by one open SSE connection. */
type Listener = (event: RealtimeEvent) => void;

/** channel → the listeners currently streaming it on this instance. */
const listeners = new Map<string, Set<Listener>>();

/** Lazily-created subscriber connection (a duplicate of the shared client). */
let subscriber: ReturnType<typeof redis.duplicate> | null = null;

/** The Redis channel carrying one user's events. */
export function userChannel(userId: string): string {
  return `events:user:${userId}`;
}

/**
 * Opens the single subscriber connection on first use.
 *
 * ponytail: one `psubscribe` over `events:user:*` instead of subscribing and
 * unsubscribing per channel — every instance receives every user's events and
 * filters locally, which is a fine trade at MVP fan-out. Switch to per-channel
 * `subscribe`/`unsubscribe` if the event volume ever makes that filtering hurt.
 */
function ensureSubscriber(): void {
  if (subscriber) return;

  subscriber = redis.duplicate();
  subscriber.on('error', (err: Error) => logger.error({ err }, 'Realtime subscriber error'));

  void subscriber.psubscribe(USER_CHANNEL_PATTERN, (err) => {
    if (err) logger.error({ err }, 'Failed to psubscribe to realtime channels');
    else logger.info({ pattern: USER_CHANNEL_PATTERN }, 'Realtime subscriber ready');
  });

  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    const targets = listeners.get(channel);
    if (!targets?.size) return;

    let event: RealtimeEvent;
    try {
      event = JSON.parse(message) as RealtimeEvent;
    } catch (err) {
      logger.error({ err, channel }, 'Dropped malformed realtime message');
      return;
    }

    for (const listener of targets) listener(event);
  });
}

/**
 * Publishes an event to a user's channel. Never throws into the caller's path —
 * a realtime hiccup must not fail the mutation that triggered it.
 */
export async function publish(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const event: RealtimeEvent = { type, payload, at: new Date().toISOString() };
  try {
    await redis.publish(userChannel(userId), JSON.stringify(event));
  } catch (err) {
    logger.error({ err, userId, type }, 'Failed to publish realtime event');
  }
}

/**
 * Streams a user's events to `listener` until the returned function is called.
 *
 * @returns An unsubscribe function — call it when the SSE connection closes.
 */
export function subscribeUser(userId: string, listener: Listener): () => void {
  ensureSubscriber();

  const channel = userChannel(userId);
  const set = listeners.get(channel) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(channel, set);

  return () => {
    const current = listeners.get(channel);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(channel);
  };
}

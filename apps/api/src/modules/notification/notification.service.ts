/**
 * Notification service (S09). `notify()` is the single entry point every other
 * module calls: it writes the in-app `Notification` row (ADR-011), publishes the
 * matching SSE event to the user's Redis channel (ADR-009), and optionally sends
 * an email through the pluggable provider (ADR-003).
 *
 * Nothing here throws into the caller. A notification failing must never roll
 * back or fail the business mutation that triggered it.
 */
import type { Notification } from '@dayflow/db';
import type { ResponseMeta } from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { buildPage, cursorArgs } from '../../lib/pagination.js';
import { publish } from '../realtime/pubsub.js';
import { emailProvider } from './providers/email.provider.js';

/** One notification to deliver to a single user. */
export interface NotifyInput {
  /** `User.id` (not `Employee.id`) — notifications hang off the account. */
  userId: string;
  /** Event name, e.g. `LEAVE_APPROVED`. Doubles as the SSE event type. */
  type: string;
  title: string;
  body: string;
  /** Extra context delivered over SSE only (not persisted on the row). */
  payload?: Record<string, unknown>;
  /** When true, also send an email via the configured provider. */
  email?: boolean;
}

/**
 * Writes the notification, pushes it over SSE, and optionally emails it.
 * Errors are logged and swallowed.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
      },
    });

    await publish(input.userId, input.type, {
      ...input.payload,
      notification: { id: row.id, type: row.type, title: row.title, body: row.body },
    });

    if (input.email) await sendEmail(input);
  } catch (err) {
    logger.error({ err, userId: input.userId, type: input.type }, 'notify() failed');
  }
}

/** Looks up the recipient's address and hands the message to the provider. */
async function sendEmail(input: NotifyInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user) return;
  await emailProvider.send({ to: user.email, subject: input.title, body: input.body });
}

/** The caller's own notifications, newest first, cursor-paginated (ADR-010). */
export async function listMine(
  userId: string,
  limit: number,
  cursor?: string,
): Promise<{ data: Notification[]; meta: ResponseMeta }> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...cursorArgs(limit, cursor),
  });
  return buildPage(rows, limit);
}

/**
 * Marks one notification read. Only its owner may do so.
 *
 * @throws {NotFoundError} When no such notification exists.
 * @throws {ForbiddenError} When it belongs to another user.
 */
export async function markRead(userId: string, id: string): Promise<Notification> {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Notification not found');
  if (existing.userId !== userId) {
    throw new ForbiddenError('You do not have permission to access this notification');
  }
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

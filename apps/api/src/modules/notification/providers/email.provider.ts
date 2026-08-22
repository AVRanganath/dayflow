/**
 * Pluggable email delivery (ADR-003). Call sites depend on the
 * {@link EmailProvider} interface only, so swapping the dev `console` provider
 * for a real one is a change here and nowhere else.
 */
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';

/** One outbound email. */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/** Anything that can deliver an {@link EmailMessage}. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Dev provider — logs the message instead of sending it (ADR-003). */
const consoleProvider: EmailProvider = {
  send: async (message: EmailMessage): Promise<void> => {
    logger.info({ email: message }, '[email:console] delivery skipped in dev');
  },
};

const PROVIDERS: Record<string, EmailProvider> = {
  console: consoleProvider,
};

/** The provider selected by `EMAIL_PROVIDER` (default `console`). */
export const emailProvider: EmailProvider = PROVIDERS[env.EMAIL_PROVIDER] ?? consoleProvider;

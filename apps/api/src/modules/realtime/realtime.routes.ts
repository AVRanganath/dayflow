/**
 * Realtime router (S09), mounted at `/api/v1/events` by `routes/index.ts`.
 *
 * Auth is the standard `Authorization: Bearer` header. Browsers' `EventSource`
 * cannot set headers, so web clients read the stream with `fetch` instead — a
 * token in the query string would end up in request logs, so it is not accepted.
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { streamEvents } from './sse.js';

export const eventsRouter: Router = Router();

eventsRouter.get('/', requireAuth, streamEvents);

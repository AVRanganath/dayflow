/**
 * Small HTTP helpers local to the attendance module (S06).
 *
 * S03's spec referenced shared `validate` / `sendSuccess` / cursor-pagination
 * helpers, but they were not committed to `apps/api/src/lib`. To stay strictly in
 * scope (attendance module only), these thin helpers live here. If S03/S04 later
 * add canonical versions under `apps/api/src/lib`, swap the imports over.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';
import type { ResponseMeta, SuccessResponse } from '@dayflow/shared';

/** Which part of the request a schema validates. */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates `req[target]` against `schema` and
 * replaces it with the parsed (and coerced) result. A `ZodError` bubbles to the
 * global error handler, which renders the ADR-010 `VALIDATION_ERROR` envelope.
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[target]);
    // `req.query`/`req.params` have read-only-ish types; assign through `unknown`.
    (req as unknown as Record<ValidationTarget, unknown>)[target] = parsed;
    next();
  };
}

/** Sends a success envelope (ADR-010). `meta` is included only for list endpoints. */
export function sendSuccess<T>(res: Response, status: number, data: T, meta?: ResponseMeta): void {
  const body: SuccessResponse<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(status).json(body);
}

/** Convenience: the inferred output type of a Zod schema. */
export type Infer<S extends ZodTypeAny> = ZodInfer<S>;

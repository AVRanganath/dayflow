/**
 * Request-validation middleware. Parses a request part (`body` | `query` |
 * `params`) with a Zod schema and replaces it with the parsed, typed value so
 * downstream handlers get coerced/defaulted data. A failed parse throws a
 * `ZodError`, which the global error middleware renders as a 400
 * `VALIDATION_ERROR` envelope (ADR-010).
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/** Which part of the request to validate. */
type RequestPart = 'body' | 'query' | 'params';

/**
 * Build a middleware that validates `req[part]` against `schema` and writes the
 * parsed result back onto the request.
 *
 * @param schema - Zod schema to parse against.
 * @param part - Request property to validate (default `body`).
 */
export function validate(schema: ZodTypeAny, part: RequestPart = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[part]);
    // `query`/`params` are read-only getters on some Express versions; assign via cast.
    (req as Record<RequestPart, unknown>)[part] = parsed;
    next();
  };
}

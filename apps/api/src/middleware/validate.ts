/**
 * Zod validation middleware (plan.md §6 — validate at the boundary). Parses the
 * request body against a shared schema, replacing `req.body` with the typed,
 * coerced result. A parse failure surfaces as a `ZodError`, which the global error
 * middleware renders as `400 VALIDATION_ERROR`.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Builds a middleware that validates `req.body` against the given schema.
 * @param schema - A Zod schema from `@dayflow/shared`.
 * @returns Express middleware that parses/replaces the body or forwards a ZodError.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data as unknown;
    next();
  };
}

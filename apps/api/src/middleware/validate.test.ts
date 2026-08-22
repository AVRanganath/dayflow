import { describe, it, expect, vi } from 'vitest';
import { validate } from './validate.js';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

describe('Validate Middleware', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().int(),
  });

  it('calls next and sets req.body for valid data', () => {
    const middleware = validate(schema);
    const req = {
      body: {
        name: 'John',
        age: 30,
        extra:
          'ignored by parse but included in body, wait, safeParse preserves extra if not strict?',
      },
    } as Request;
    // actually Zod by default drops unrecognized keys on parse
    req.body = { name: 'John', age: 30, extra: 'ignored' };

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.body).toEqual({ name: 'John', age: 30 }); // extra is stripped
  });

  it('calls next with ZodError for invalid data', () => {
    const middleware = validate(schema);
    const req = {
      body: { name: 'J', age: 'not-a-number' }, // invalid
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    // next should be called with a ZodError
    expect(next.mock.calls[0]![0]).toBeInstanceOf(z.ZodError);
  });
});

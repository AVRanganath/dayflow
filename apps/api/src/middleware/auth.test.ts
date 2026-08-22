import { describe, it, expect, vi } from 'vitest';
import { requireAuth, requireRole } from './auth.js';
import { verifyAccess } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../lib/jwt.js', () => ({
  verifyAccess: vi.fn(),
}));

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    it('sets req.user when token is valid', () => {
      const mockVerify = vi.mocked(verifyAccess);
      mockVerify.mockReturnValue({ sub: 'user-1', role: 'ADMIN', employeeId: null });

      const req = { headers: { authorization: 'Bearer valid-token' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      requireAuth(req, res, next);

      expect(mockVerify).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual({ id: 'user-1', role: 'ADMIN' });
      expect(next).toHaveBeenCalledOnce();
    });

    it('throws UnauthorizedError if header is missing', () => {
      const req = { headers: {} } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => requireAuth(req, res, next)).toThrow(UnauthorizedError);
      expect(() => requireAuth(req, res, next)).toThrow(
        'Missing or malformed Authorization header',
      );
    });

    it('throws UnauthorizedError if header does not start with Bearer', () => {
      const req = { headers: { authorization: 'Basic token' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => requireAuth(req, res, next)).toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError if token is empty', () => {
      const req = { headers: { authorization: 'Bearer   ' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      expect(() => requireAuth(req, res, next)).toThrow(UnauthorizedError);
    });
  });

  describe('requireRole', () => {
    it('calls next if user has the required role', () => {
      const req = { user: { id: '1', role: 'HR' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole('HR', 'ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('throws ForbiddenError if user does not have the required role', () => {
      const req = { user: { id: '1', role: 'EMPLOYEE' } } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole('HR', 'ADMIN');

      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
      expect(() => middleware(req, res, next)).toThrow(
        'You do not have permission to access this resource',
      );
    });

    it('throws UnauthorizedError if req.user is missing (e.g. requireAuth not called)', () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const middleware = requireRole('HR', 'ADMIN');

      expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
    });
  });
});

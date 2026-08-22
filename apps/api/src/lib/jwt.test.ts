import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccess, verifyRefresh } from './jwt.js';
import { UnauthorizedError } from './errors.js';
import jwt from 'jsonwebtoken';

vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRY: '7d',
  }
}));

describe('JWT Utils', () => {
  const accessPayload = {
    sub: 'user-123',
    employeeId: 'emp-123',
    role: 'EMPLOYEE' as const,
  };

  const refreshPayload = {
    sub: 'user-123',
    role: 'EMPLOYEE' as const,
  };

  describe('signAccessToken & verifyAccess', () => {
    it('signs and verifies a valid access token', () => {
      const token = signAccessToken(accessPayload);
      expect(typeof token).toBe('string');
      
      const decoded = verifyAccess(token);
      expect(decoded.sub).toBe(accessPayload.sub);
      expect(decoded.employeeId).toBe(accessPayload.employeeId);
      expect(decoded.role).toBe(accessPayload.role);
    });

    it('throws UnauthorizedError on invalid token', () => {
      expect(() => verifyAccess('invalid.token.here')).toThrow(UnauthorizedError);
      expect(() => verifyAccess('invalid.token.here')).toThrow('Invalid or expired access token');
    });

    it('throws on expired token', () => {
      // Create an expired token manually using the test secret
      const expiredToken = jwt.sign(accessPayload, 'test-access-secret', { expiresIn: '-1s' });
      expect(() => verifyAccess(expiredToken)).toThrow(UnauthorizedError);
    });

    it('throws when verifying with wrong secret', () => {
      const wrongToken = jwt.sign(accessPayload, 'wrong-secret', { expiresIn: '15m' });
      expect(() => verifyAccess(wrongToken)).toThrow(UnauthorizedError);
    });
  });

  describe('signRefreshToken & verifyRefresh', () => {
    it('signs and verifies a valid refresh token', () => {
      const token = signRefreshToken(refreshPayload);
      expect(typeof token).toBe('string');
      
      const decoded = verifyRefresh(token);
      expect(decoded.sub).toBe(refreshPayload.sub);
      expect(decoded.role).toBe(refreshPayload.role);
      expect(typeof decoded.jti).toBe('string');
      expect(typeof decoded.exp).toBe('number');
    });

    it('uses provided jti if passed', () => {
      const token = signRefreshToken({ ...refreshPayload, jti: 'custom-jti-456' });
      const decoded = verifyRefresh(token);
      expect(decoded.jti).toBe('custom-jti-456');
    });

    it('throws UnauthorizedError on invalid token', () => {
      expect(() => verifyRefresh('invalid')).toThrow(UnauthorizedError);
      expect(() => verifyRefresh('invalid')).toThrow('Invalid or expired refresh token');
    });

    it('throws if payload misses jti or exp (e.g. manually signed incorrectly)', () => {
      // Manually sign a payload without exp to test the check
      // jsonwebtoken sign will add exp if expiresIn is provided, so we don't provide it
      const badToken = jwt.sign(refreshPayload, 'test-refresh-secret');
      expect(() => verifyRefresh(badToken)).toThrow(UnauthorizedError);
    });
  });
});

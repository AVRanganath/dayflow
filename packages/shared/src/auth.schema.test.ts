import { describe, it, expect } from 'vitest';
import {
  SignupSchema,
  SigninSchema,
  ChangePasswordSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from './auth.schema.js';

describe('Auth Schemas', () => {
  describe('SignupSchema', () => {
    it('validates a correct payload', () => {
      const data = {
        companyName: 'Acme Corp',
        adminEmail: 'admin@acme.com',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = SignupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects short passwords', () => {
      const data = {
        companyName: 'Acme',
        adminEmail: 'admin@acme.com',
        password: 'short', // < 8 chars
        firstName: 'J', // should be at least 2 chars but let's test one thing
        lastName: 'D',
      };
      const result = SignupSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('password'))).toBe(true);
      }
    });

    it('rejects invalid email', () => {
      const data = {
        companyName: 'Acme',
        adminEmail: 'not-an-email',
        password: 'securepassword',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = SignupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      const result = SignupSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('SigninSchema', () => {
    it('validates with email', () => {
      const result = SigninSchema.safeParse({ identifier: 'test@test.com', password: 'pass' });
      expect(result.success).toBe(true);
    });

    it('validates with login id', () => {
      const result = SigninSchema.safeParse({ identifier: 'LOGIN123', password: 'pass' });
      expect(result.success).toBe(true);
    });

    it('rejects empty fields', () => {
      expect(SigninSchema.safeParse({ identifier: '', password: 'pass' }).success).toBe(false);
      expect(SigninSchema.safeParse({ identifier: 'id', password: '' }).success).toBe(false);
    });
  });

  describe('ChangePasswordSchema', () => {
    it('validates correct passwords', () => {
      const result = ChangePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'newsecurepassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short new passwords', () => {
      const result = ChangePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RefreshSchema', () => {
    it('validates token', () => {
      expect(RefreshSchema.safeParse({ refreshToken: 'token123' }).success).toBe(true);
    });
    it('rejects empty', () => {
      expect(RefreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
  });

  describe('ForgotPasswordSchema', () => {
    it('validates email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'test@test.com' }).success).toBe(true);
    });
    it('rejects invalid email', () => {
      expect(ForgotPasswordSchema.safeParse({ email: 'test' }).success).toBe(false);
    });
  });

  describe('ResetPasswordSchema', () => {
    it('validates token and password', () => {
      expect(
        ResetPasswordSchema.safeParse({ token: 'abc', newPassword: 'longpassword' }).success,
      ).toBe(true);
    });
    it('rejects short password', () => {
      expect(ResetPasswordSchema.safeParse({ token: 'abc', newPassword: 'short' }).success).toBe(
        false,
      );
    });
  });
});

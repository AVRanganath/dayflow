import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError } from './errors.js';

describe('AppErrors', () => {
  it('AppError should set properties correctly', () => {
    const err = new AppError(500, 'TEST_CODE', 'Test message', { info: 1 });
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('Test message');
    expect(err.details).toEqual({ info: 1 });
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('NotFoundError should have 404 status', () => {
    const err = new NotFoundError('Custom not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Custom not found');
  });

  it('ValidationError should have 400 status', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('UnauthorizedError should have 401 status', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError should have 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('ConflictError should have 409 status', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

import { describe, it, expect } from 'vitest';
import { PaginationQuerySchema } from './envelope.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from './constants.js';

describe('PaginationQuerySchema', () => {
  it('should parse valid input', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '10', cursor: 'abc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.cursor).toBe('abc');
    }
  });

  it('should use default limit if not provided', () => {
    const result = PaginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(DEFAULT_LIMIT);
    }
  });

  it('should cap limit at MAX_LIMIT', () => {
    const result = PaginationQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false); // Because max(MAX_LIMIT) which is 100
  });

  it('should reject invalid types', () => {
    const result = PaginationQuerySchema.safeParse({ limit: 'not-a-number' });
    expect(result.success).toBe(false);
  });
});

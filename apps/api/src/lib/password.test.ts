import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password.js';

describe('Password Utils', () => {
  it('hashes a password and returns a different string', async () => {
    const plain = 'secret123';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash).toBeTypeOf('string');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password', async () => {
    const plain = 'secure_password';
    const hash = await hashPassword(plain);
    const isValid = await comparePassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct_password');
    const isValid = await comparePassword('wrong_password', hash);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for the same password due to salting', async () => {
    const plain = 'same_password';
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);
    expect(hash1).not.toEqual(hash2);
    // But both should be valid
    expect(await comparePassword(plain, hash1)).toBe(true);
    expect(await comparePassword(plain, hash2)).toBe(true);
  });
});

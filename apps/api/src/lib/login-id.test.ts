/**
 * Unit tests for `generateLoginId` / `generateTempPassword` (ADR-012).
 *
 * Uses Node's built-in test runner (`node:test`) so no extra dev dependency is
 * needed. Run with: `npx tsx --test src/lib/login-id.test.ts` (or point the
 * runner at this file).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateLoginId, generateTempPassword } from './login-id.js';

test('generateLoginId — canonical ADR-012 example', () => {
  assert.equal(generateLoginId('OI', 'John', 'Doe', 2022, 1), 'OIJODO20220001');
});

test('generateLoginId — zero-pads the serial to four digits', () => {
  assert.equal(generateLoginId('OI', 'Jane', 'Smith', 2023, 7), 'OIJASM20230007');
  assert.equal(generateLoginId('OI', 'Alan', 'Turing', 2024, 1234), 'OIALTU20241234');
});

test('generateLoginId — uppercases prefix and name fragments', () => {
  assert.equal(generateLoginId('oi', 'john', 'doe', 2022, 1), 'OIJODO20220001');
});

test('generateLoginId — pads short name parts with X', () => {
  assert.equal(generateLoginId('OI', 'A', 'B', 2022, 1), 'OIAXBX20220001');
});

test('generateLoginId — strips non-letters before taking two chars', () => {
  assert.equal(generateLoginId('OI', "O'Brien", 'Doe', 2022, 1), 'OIOBDO20220001');
});

test('generateLoginId — honours a non-default company prefix', () => {
  assert.equal(generateLoginId('AB', 'John', 'Doe', 2022, 1), 'ABJODO20220001');
});

test('generateTempPassword — respects minimum length and character classes', () => {
  const pw = generateTempPassword(12);
  assert.equal(pw.length, 12);
  assert.match(pw, /[A-Z]/);
  assert.match(pw, /[a-z]/);
  assert.match(pw, /[0-9]/);
  assert.match(pw, /[!@#$%&*]/);
});

test('generateTempPassword — enforces an 8-char floor', () => {
  assert.equal(generateTempPassword(4).length, 8);
});

import { test, expect } from 'vitest';
import { generateLoginId, generateTempPassword } from './login-id.js';

test('generateLoginId — canonical ADR-012 example', () => {
  expect(generateLoginId('OI', 'John', 'Doe', 2022, 1)).toBe('OIJODO20220001');
});

test('generateLoginId — zero-pads the serial to four digits', () => {
  expect(generateLoginId('OI', 'Jane', 'Smith', 2023, 7)).toBe('OIJASM20230007');
  expect(generateLoginId('OI', 'Alan', 'Turing', 2024, 1234)).toBe('OIALTU20241234');
});

test('generateLoginId — uppercases prefix and name fragments', () => {
  expect(generateLoginId('oi', 'john', 'doe', 2022, 1)).toBe('OIJODO20220001');
});

test('generateLoginId — pads short name parts with X', () => {
  expect(generateLoginId('OI', 'A', 'B', 2022, 1)).toBe('OIAXBX20220001');
});

test('generateLoginId — strips non-letters before taking two chars', () => {
  expect(generateLoginId('OI', "O'Brien", 'Doe', 2022, 1)).toBe('OIOBDO20220001');
});

test('generateLoginId — honours a non-default company prefix', () => {
  expect(generateLoginId('AB', 'John', 'Doe', 2022, 1)).toBe('ABJODO20220001');
});

test('generateTempPassword — respects minimum length and character classes', () => {
  const pw = generateTempPassword(12);
  expect(pw.length).toBe(12);
  expect(pw).toMatch(/[A-Z]/);
  expect(pw).toMatch(/[a-z]/);
  expect(pw).toMatch(/[0-9]/);
  expect(pw).toMatch(/[!@#$%&*]/);
});

test('generateTempPassword — enforces an 8-char floor', () => {
  expect(generateTempPassword(4).length).toBe(8);
});

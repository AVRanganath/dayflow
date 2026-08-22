import { describe, it, expect } from 'vitest';
import {
  UpdateProfileSchema,
  AdminUpdateEmployeeSchema,
  CreateEmployeeSchema,
  EmployeeListQuerySchema,
} from './employee.schema.js';

describe('Employee Schemas', () => {
  describe('UpdateProfileSchema', () => {
    it('allows valid profile updates', () => {
      const data = {
        phone: '1234567890',
        personalEmail: 'test@personal.com',
        address: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        about: 'I am a developer',
        skills: ['React', 'Node'],
      };
      expect(UpdateProfileSchema.safeParse(data).success).toBe(true);
    });

    it('rejects restricted fields (strict mode)', () => {
      const data = {
        phone: '1234567890',
        salary: 100000, // Should be rejected by .strict()
        role: 'ADMIN', // Should be rejected
      };
      expect(UpdateProfileSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('AdminUpdateEmployeeSchema', () => {
    it('allows full profile updates', () => {
      const data = {
        firstName: 'John',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        workingDaysPerWeek: 5,
        designation: 'Senior Developer',
      };
      expect(AdminUpdateEmployeeSchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid iso dates', () => {
      expect(AdminUpdateEmployeeSchema.safeParse({ dateOfBirth: '01/01/1990' }).success).toBe(
        false,
      );
      expect(AdminUpdateEmployeeSchema.safeParse({ dateOfBirth: '1990-1-1' }).success).toBe(false);
    });

    it('rejects invalid working days', () => {
      expect(AdminUpdateEmployeeSchema.safeParse({ workingDaysPerWeek: 8 }).success).toBe(false);
      expect(AdminUpdateEmployeeSchema.safeParse({ workingDaysPerWeek: 0 }).success).toBe(false);
    });
  });

  describe('CreateEmployeeSchema', () => {
    it('validates a correct payload', () => {
      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@company.com',
        role: 'EMPLOYEE',
        dateOfJoining: '2026-08-22',
        employmentType: 'FULL_TIME',
      };
      expect(CreateEmployeeSchema.safeParse(data).success).toBe(true);
    });

    it('rejects invalid roles for new employees', () => {
      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@company.com',
        role: 'ADMIN', // ADMIN shouldn't be allowed in CreateEmployeeSchema according to the Zod enum
        dateOfJoining: '2026-08-22',
        employmentType: 'FULL_TIME',
      };
      expect(CreateEmployeeSchema.safeParse(data).success).toBe(false);
    });

    it('rejects invalid dates', () => {
      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@company.com',
        role: 'EMPLOYEE',
        dateOfJoining: '22-08-2026', // wrong format
        employmentType: 'FULL_TIME',
      };
      expect(CreateEmployeeSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('EmployeeListQuerySchema', () => {
    it('validates search and filters', () => {
      const result = EmployeeListQuerySchema.safeParse({
        search: 'Jane',
        role: 'EMPLOYEE',
        employmentType: 'FULL_TIME',
      });
      expect(result.success).toBe(true);
    });

    it('validates without any filters', () => {
      expect(EmployeeListQuerySchema.safeParse({}).success).toBe(true);
    });
  });
});

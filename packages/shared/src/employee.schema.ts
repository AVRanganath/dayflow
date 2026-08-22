/**
 * @dayflow/shared — employee & profile schemas (ADR-012, ADR-015).
 *
 * Employees are created by Admin/HR (ADR-012) — `loginId` and the temporary password
 * are server-generated and never in the request body. Self-editable fields are a
 * strict subset; admins may edit the full expanded profile (ADR-015).
 */
import { z } from 'zod';
import {
  EmploymentTypeSchema,
  GenderSchema,
  MaritalStatusSchema,
  RoleSchema,
} from './constants.js';

/** ISO calendar date `YYYY-MM-DD` (Prisma `@db.Date` fields). */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date as YYYY-MM-DD');

/** Optional "Resume" tab content (ADR-015). */
const resumeFields = {
  about: z.string().optional(),
  whatILove: z.string().optional(),
  hobbies: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
};

/**
 * Fields an employee may edit on their own profile (ADR-015 self-editable subset).
 * `.strict()` rejects any attempt to self-edit a restricted field (e.g. salary, role).
 */
export const UpdateProfileSchema = z
  .object({
    phone: z.string().optional(),
    personalEmail: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    profilePicture: z.string().url().optional(),
    ...resumeFields,
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Full editable set for Admin/HR (ADR-015). All optional (partial update). */
export const AdminUpdateEmployeeSchema = z
  .object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    personalEmail: z.string().email().optional(),
    dateOfBirth: isoDate.optional(),
    gender: GenderSchema.optional(),
    maritalStatus: MaritalStatusSchema.optional(),
    nationality: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    profilePicture: z.string().url().optional(),
    panNumber: z.string().optional(),
    uanNumber: z.string().optional(),
    employeeCode: z.string().optional(),
    workingDaysPerWeek: z.number().int().min(1).max(7).optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankIfsc: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    designation: z.string().optional(),
    employmentType: EmploymentTypeSchema.optional(),
    managerId: z.string().uuid().optional(),
    ...resumeFields,
  })
  .strict();
export type AdminUpdateEmployeeInput = z.infer<typeof AdminUpdateEmployeeSchema>;

/**
 * Admin/HR create-employee body (ADR-012). The server mints `User`+`Employee`,
 * generates the `loginId` and a temporary password (returned once), and seeds a
 * default leave balance. New users are `EMPLOYEE` or `HR` only.
 */
export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['EMPLOYEE', 'HR']).default('EMPLOYEE'),
  dateOfJoining: isoDate,
  employmentType: EmploymentTypeSchema,
  departmentId: z.string().uuid().optional(),
  designation: z.string().optional(),
  managerId: z.string().uuid().optional(),
  phone: z.string().optional(),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

/** Query for the admin employee directory (search + filters + pagination). */
export const EmployeeListQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  employmentType: EmploymentTypeSchema.optional(),
  role: RoleSchema.optional(),
});
export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

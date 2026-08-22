/**
 * @dayflow/shared — barrel export.
 *
 * The single source of truth for request/response Zod schemas, their inferred TS
 * types, enums, route constants, and the API envelope — imported by both apps/api
 * (boundary validation) and apps/web (typed client + form validation). Never
 * hand-write a type that a schema already infers.
 */

/** Marker retained for tooling; superseded by the real exports below. */
export const DAYFLOW_SHARED_VERSION = '0.2.0';

export * from './constants.js';
export * from './envelope.js';
export * from './auth.schema.js';
export * from './employee.schema.js';
export * from './attendance.schema.js';
export * from './leave.schema.js';
export * from './payroll.schema.js';
export * from './company.schema.js';

/**
 * Request validation for `/payroll` — reuses `@dayflow/shared` schemas (plan.md
 * §6: never inline-define a schema that belongs in the shared package). The only
 * local addition is composing the existing list-query + pagination schemas,
 * which is a module-level concern, not a shared-contract change.
 */
import {
  PaginationQuerySchema,
  PayrollListQuerySchema,
  SalaryStructureSchema,
} from '@dayflow/shared';

export { SalaryStructureSchema };

/** `GET /payroll` query: month/year filter (shared) + cursor pagination (shared). */
export const PayrollListWithCursorSchema = PayrollListQuerySchema.merge(PaginationQuerySchema);
export type PayrollListWithCursorQuery = ReturnType<typeof PayrollListWithCursorSchema.parse>;

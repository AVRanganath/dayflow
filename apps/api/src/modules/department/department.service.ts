/**
 * Department service — the single query behind the department list. Kept in the
 * service layer so controllers hold no Prisma access.
 */
import { prisma } from '../../lib/prisma.js';

/** A department as exposed by the list endpoint. */
export interface DepartmentListItem {
  id: string;
  name: string;
  description: string | null;
}

/** List all departments, alphabetically by name. */
export async function listDepartments(): Promise<DepartmentListItem[]> {
  return prisma.department.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });
}

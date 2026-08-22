/**
 * Company service (ADR-016) — single-company MVP. Reads/updates the one seeded
 * `Company` row; all Prisma access lives here.
 */
import type { Prisma } from '@dayflow/db';
import type { UpdateCompanyInput } from '@dayflow/shared';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

/** Fields returned for the company (excludes internal timestamps? — keep all). */
const companySelect = {
  id: true,
  name: true,
  logoUrl: true,
  loginIdPrefix: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

type CompanyRecord = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;

/** The single (oldest) company row. */
async function getSingletonId(): Promise<string> {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!company) throw new NotFoundError('No company configured');
  return company.id;
}

/** Fetch the single company row (any authenticated role). */
export async function getCompany(): Promise<CompanyRecord> {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' },
    select: companySelect,
  });
  if (!company) throw new NotFoundError('No company configured');
  return company;
}

/**
 * Update the company (ADMIN-only, ADR-016). `settings` is merged shallowly onto
 * the existing settings JSON so a partial `settings` patch doesn't drop keys.
 */
export async function updateCompany(input: UpdateCompanyInput): Promise<CompanyRecord> {
  const id = await getSingletonId();

  const data: Prisma.CompanyUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.loginIdPrefix !== undefined) data.loginIdPrefix = input.loginIdPrefix;

  if (input.settings !== undefined) {
    const current = await prisma.company.findUnique({
      where: { id },
      select: { settings: true },
    });
    const existing =
      current?.settings && typeof current.settings === 'object' && !Array.isArray(current.settings)
        ? (current.settings as Record<string, unknown>)
        : {};
    data.settings = { ...existing, ...input.settings } as Prisma.InputJsonValue;
  }

  return prisma.company.update({ where: { id }, data, select: companySelect });
}

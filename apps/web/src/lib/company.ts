/**
 * Typed fetchers for the single-company record (ADR-016).
 *
 * The API returns the company object directly as the envelope `data` (the client
 * already unwraps it), and `settings` is freeform JSON — every field is optional so
 * the UI can render only the keys that exist. `updateCompany` is ADMIN-only server-side.
 */
import { API_ROUTES } from '@dayflow/shared';
import { api } from './api/client';

/**
 * Freeform payroll & policy settings stored on the company (ADR-016).
 * All fields are optional; render whichever keys are present. Percentages are
 * expressed as rates (e.g. `12` = 12%), not currency amounts.
 */
export interface CompanySettings {
  /** Employee provident-fund contribution rate (%). */
  pfEmployeePct?: number;
  /** Employer provident-fund contribution rate (%). */
  pfEmployerPct?: number;
  /** Flat professional tax (state levy). */
  professionalTax?: number;
  /** Basic salary as a percentage of CTC. */
  basicPct?: number;
  /** House rent allowance as a percentage of basic. */
  hraPct?: number;
  /** Leave travel allowance as a percentage. */
  ltaPct?: number;
  /** Performance bonus as a percentage. */
  performanceBonusPct?: number;
  /** Flat standard allowance amount. */
  standardAllowance?: number;
  /** Number of working days in a week. */
  workingDaysPerWeek?: number;
  /** Allow forward-compatible extra keys the API may add. */
  [key: string]: number | undefined;
}

/**
 * The single-company record (MVP branding + payroll settings, ADR-016).
 */
export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  loginIdPrefix: string;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Editable fields accepted by `PUT /company` (ADMIN only, ADR-016). All optional —
 * only the provided fields are updated; `settings` is expected pre-merged by the caller.
 */
export interface UpdateCompanyInput {
  name?: string;
  logoUrl?: string | null;
  loginIdPrefix?: string;
  settings?: CompanySettings;
}

/**
 * Fetches the company record (`GET /company`, any authenticated role).
 * The client unwraps the envelope, so this resolves to the {@link Company} directly.
 */
export function getCompany(): Promise<Company> {
  return api.get<Company>(API_ROUTES.company.base);
}

/**
 * Updates the company record (`PUT /company`, ADMIN only). Returns the updated company.
 */
export function updateCompany(body: UpdateCompanyInput): Promise<Company> {
  return api.put<Company>(API_ROUTES.company.base, body);
}

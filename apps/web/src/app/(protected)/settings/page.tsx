'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Lock, Save, SlidersHorizontal } from 'lucide-react';
import { Button, Input, useToast } from '../../../components/ui';
import { ApiError } from '../../../lib/api/types';
import { useAuth } from '../../../lib/auth/useAuth';
import {
  getCompany,
  updateCompany,
  type Company,
  type CompanySettings,
} from '../../../lib/company';

/** Ordered, human-readable labels for the known payroll & policy setting keys. */
const SETTINGS_LABELS: Record<string, string> = {
  pfEmployeePct: 'PF — Employee (%)',
  pfEmployerPct: 'PF — Employer (%)',
  professionalTax: 'Professional Tax',
  basicPct: 'Basic (% of CTC)',
  hraPct: 'HRA (% of Basic)',
  ltaPct: 'LTA (%)',
  performanceBonusPct: 'Performance Bonus (%)',
  standardAllowance: 'Standard Allowance',
  workingDaysPerWeek: 'Working Days / Week',
};

/** Preferred display order; any unknown keys are appended afterwards. */
const SETTINGS_ORDER = Object.keys(SETTINGS_LABELS);

/** Renders a human label for a settings key, falling back to a de-camelCased key. */
function labelFor(key: string): string {
  return (
    SETTINGS_LABELS[key] ??
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}

/** Returns the settings keys that exist on the record, in a stable, sensible order. */
function orderedSettingsKeys(settings: CompanySettings): string[] {
  const present = Object.keys(settings).filter((k) => settings[k] !== undefined);
  const known = SETTINGS_ORDER.filter((k) => present.includes(k));
  const extra = present.filter((k) => !SETTINGS_ORDER.includes(k)).sort();
  return [...known, ...extra];
}

/**
 * PAGE — Settings (ADR-016). Loads `GET /company` and renders two sections:
 * Company branding (name, logo URL, login-ID prefix) and Payroll & Policy settings
 * (PF %, professional tax, component rates, working days/week). ADMIN sees editable
 * inputs with a Save button that `PUT /company`; HR/EMPLOYEE see a locked, read-only view.
 */
export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable form state (string-backed so inputs stay controlled and clearable).
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loginIdPrefix, setLoginIdPrefix] = useState('');
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompany();
        if (!mounted) return;
        hydrate(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : 'Could not load company settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Loads a fetched company record into local component + form state. */
  function hydrate(data: Company): void {
    setCompany(data);
    setName(data.name ?? '');
    setLogoUrl(data.logoUrl ?? '');
    setLoginIdPrefix(data.loginIdPrefix ?? '');
    const form: Record<string, string> = {};
    const settings = data.settings ?? {};
    for (const key of orderedSettingsKeys(settings)) {
      const val = settings[key];
      form[key] = val === undefined ? '' : String(val);
    }
    setSettingsForm(form);
  }

  const settingsKeys = useMemo(
    () => (company ? orderedSettingsKeys(company.settings ?? {}) : []),
    [company],
  );

  /** Builds a merged settings object from the base record + edited numeric fields. */
  function buildSettings(): CompanySettings {
    const merged: CompanySettings = { ...(company?.settings ?? {}) };
    for (const key of settingsKeys) {
      const raw = settingsForm[key];
      if (raw === undefined || raw.trim() === '') {
        delete merged[key];
        continue;
      }
      const num = Number(raw);
      merged[key] = Number.isNaN(num) ? merged[key] : num;
    }
    return merged;
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!isAdmin || !company) return;
    setSaving(true);
    try {
      const updated = await updateCompany({
        name: name.trim(),
        logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
        loginIdPrefix: loginIdPrefix.trim(),
        settings: buildSettings(),
      });
      hydrate(updated);
      toast.success('Company settings saved.', 'Saved');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save company settings';
      toast.error(message, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center shadow-card">
        <h3 className="text-lg font-bold text-text-primary">Unable to load settings</h3>
        <p className="mt-1 text-sm text-text-secondary">{error ?? 'No company found.'}</p>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSave}>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold text-text-primary">Settings</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isAdmin
              ? 'Manage company branding and payroll & policy defaults.'
              : 'Company branding and payroll & policy defaults (read-only).'}
          </p>
        </div>
        {isAdmin ? (
          <Button
            type="submit"
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            className="self-start sm:self-auto"
          >
            Save changes
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 self-start rounded-btn border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-secondary">
            <Lock className="h-3.5 w-3.5" />
            Read-only
          </span>
        )}
      </div>

      {/* Company section */}
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary-tint text-primary">
            <Building2 className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-text-primary">Company</h2>
            <p className="text-xs text-text-secondary">
              Branding and identity used across Dayflow.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            placeholder="Acme Inc."
          />
          <Input
            label="Login ID prefix"
            value={loginIdPrefix}
            onChange={(e) => setLoginIdPrefix(e.target.value.toUpperCase())}
            disabled={!isAdmin}
            placeholder="OI"
            helperText="Prefix for generated employee login IDs."
          />
          <div className="md:col-span-2">
            <Input
              label="Logo URL"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!isAdmin}
              placeholder="https://…/logo.png"
            />
          </div>
        </div>
      </section>

      {/* Payroll & Policy settings section */}
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary-tint text-primary">
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-text-primary">
              Payroll &amp; Policy settings
            </h2>
            <p className="text-xs text-text-secondary">
              Contribution rates, component percentages, and working-day defaults.
            </p>
          </div>
        </div>

        {settingsKeys.length === 0 ? (
          <p className="text-sm text-text-secondary">No payroll settings configured.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {settingsKeys.map((key) => (
              <Input
                key={key}
                label={labelFor(key)}
                type="number"
                inputMode="decimal"
                step="any"
                value={settingsForm[key] ?? ''}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, [key]: e.target.value }))}
                disabled={!isAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sticky footer save for admins on long forms */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button type="submit" isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
            Save changes
          </Button>
        </div>
      )}
    </form>
  );
}

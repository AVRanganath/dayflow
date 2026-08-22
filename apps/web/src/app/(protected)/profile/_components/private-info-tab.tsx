'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Textarea, useToast } from '../../../../components/ui';
import { UpdateProfileSchema } from '@dayflow/shared';
import { formatDate } from '../../../../lib/format';
import { ApiError } from '../../../../lib/api/types';
import { updateMe, type Employee } from '../../../../lib/employees';
import { ReadonlyField } from './profile-field';

/**
 * Private Info tab (ADR-015). Shows Date of Birth, Residing Address, Personal
 * Email, Gender, Nationality, Marital Status, PAN No, UAN No, Emp Code, and Bank
 * Details (Account Number, Bank Name, IFSC).
 *
 * **Editable-limited:** only the self-editable subset (personal email, phone,
 * residing address + city/state/country/zip — the ADR-015 whitelist) is
 * editable. Restricted fields (DOB, gender, nationality, marital status, PAN,
 * UAN, Emp Code, bank details) render locked (lock icon + gray, read-only).
 * "Save Changes" calls `PUT /employees/me`; input is validated with the shared
 * Zod schema before sending.
 */
export interface PrivateInfoTabProps {
  employee: Employee;
  onSaved: (updated: Employee) => void;
}

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  OTHER: 'Other',
};

export function PrivateInfoTab({ employee, onSaved }: PrivateInfoTabProps) {
  const toast = useToast();
  const [personalEmail, setPersonalEmail] = useState(employee.personalEmail ?? '');
  const [phone, setPhone] = useState(employee.phone ?? '');
  const [address, setAddress] = useState(employee.address ?? '');
  const [city, setCity] = useState(employee.city ?? '');
  const [state, setState] = useState(employee.state ?? '');
  const [country, setCountry] = useState(employee.country ?? '');
  const [zipCode, setZipCode] = useState(employee.zipCode ?? '');
  const [emailError, setEmailError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setEmailError(undefined);
    const parsed = UpdateProfileSchema.safeParse({
      personalEmail: personalEmail || undefined,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      zipCode: zipCode || undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === 'personalEmail') setEmailError(issue.message);
      toast.error(issue?.message ?? 'Please check your details', 'Invalid input');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMe(parsed.data);
      onSaved(updated);
      toast.success('Your personal details were saved.', 'Saved');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save your changes';
      toast.error(message, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-7">
      {/* Editable personal fields (ADR-015 self-editable subset). */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Personal Email"
          type="email"
          value={personalEmail}
          error={emailError}
          onChange={(e) => setPersonalEmail(e.target.value)}
          placeholder="you@personal.com"
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Residing Address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, area, landmark"
          />
        </div>
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
        <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        <Input label="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
      </div>

      {/* Locked / restricted fields (read-only per ADR-015). */}
      <div className="grid grid-cols-1 gap-5 border-t border-hairline pt-6 sm:grid-cols-2">
        <ReadonlyField label="Date of Birth" value={formatDate(employee.dateOfBirth)} locked />
        <ReadonlyField
          label="Gender"
          value={employee.gender ? GENDER_LABELS[employee.gender] : null}
          locked
        />
        <ReadonlyField label="Nationality" value={employee.nationality} locked />
        <ReadonlyField
          label="Marital Status"
          value={employee.maritalStatus ? MARITAL_LABELS[employee.maritalStatus] : null}
          locked
        />
        <ReadonlyField label="PAN No" value={employee.panNumber} locked />
        <ReadonlyField label="UAN No" value={employee.uanNumber} locked />
        <ReadonlyField label="Emp Code" value={employee.employeeCode} locked />
      </div>

      {/* Bank details (locked). */}
      <div className="border-t border-hairline pt-6">
        <h4 className="mb-4 font-display text-sm font-bold text-text-primary">Bank Details</h4>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <ReadonlyField label="Account Number" value={employee.bankAccountNumber} locked />
          <ReadonlyField label="Bank Name" value={employee.bankName} locked />
          <ReadonlyField label="IFSC" value={employee.bankIfsc} locked />
        </div>
      </div>

      <div className="mt-1">
        <Button variant="primary" onClick={handleSave} isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

export default PrivateInfoTab;

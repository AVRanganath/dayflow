'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, Textarea, useToast } from '../../../../components/ui';
import { UpdateProfileSchema } from '@dayflow/shared';
import { ApiError } from '../../../../lib/api/types';
import { updateMe, type Employee } from '../../../../lib/employees';

/**
 * Resume tab (ADR-015): About, "What I love about my job", Interests & Hobbies,
 * Skills, Certification. These are the optional, **self-editable** Resume fields
 * (`about`, `whatILove`, `hobbies`, `skills`, `certifications`). `skills` and
 * `certifications` are string arrays (comma-separated in the UI). Saves via
 * `PUT /employees/me` and validates client-side with the shared Zod schema.
 */
export interface ResumeTabProps {
  employee: Employee;
  /** Called with the refreshed record after a successful save. */
  onSaved: (updated: Employee) => void;
}

/** Split a comma-separated string into a trimmed, non-empty list. */
function toList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ResumeTab({ employee, onSaved }: ResumeTabProps) {
  const toast = useToast();
  const [about, setAbout] = useState(employee.about ?? '');
  const [whatILove, setWhatILove] = useState(employee.whatILove ?? '');
  const [hobbies, setHobbies] = useState(employee.hobbies ?? '');
  const [skills, setSkills] = useState(employee.skills.join(', '));
  const [certifications, setCertifications] = useState(employee.certifications.join(', '));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = UpdateProfileSchema.safeParse({
      about: about || undefined,
      whatILove: whatILove || undefined,
      hobbies: hobbies || undefined,
      skills: toList(skills),
      certifications: toList(certifications),
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? 'Please check the Resume fields',
        'Invalid input',
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMe(parsed.data);
      onSaved(updated);
      toast.success('Your resume details were saved.', 'Saved');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save your changes';
      toast.error(message, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-7">
      <Textarea
        label="About"
        rows={3}
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        placeholder="A short introduction about yourself"
      />
      <Textarea
        label="What I love about my job"
        rows={2}
        value={whatILove}
        onChange={(e) => setWhatILove(e.target.value)}
        placeholder="What keeps you motivated at work"
      />
      <Textarea
        label="Interests & Hobbies"
        rows={2}
        value={hobbies}
        onChange={(e) => setHobbies(e.target.value)}
        placeholder="Reading, hiking, photography…"
      />
      <Input
        label="Skills"
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        helperText="Comma-separated, e.g. TypeScript, React, Node.js"
        placeholder="TypeScript, React, Node.js"
      />
      <Input
        label="Certification"
        value={certifications}
        onChange={(e) => setCertifications(e.target.value)}
        helperText="Comma-separated, e.g. AWS Solutions Architect, PMP"
        placeholder="AWS Solutions Architect, PMP"
      />

      <div className="mt-1">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

export default ResumeTab;

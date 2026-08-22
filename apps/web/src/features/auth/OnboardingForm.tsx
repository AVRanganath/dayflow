'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Building2 } from 'lucide-react';
import { useAuth, type AuthUser } from '../../lib/auth';
import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordField } from './PasswordField';
import { PasswordStrength } from './PasswordStrength';

const OnboardingFormSchema = z
  .object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    fullName: z
      .string()
      .min(2, 'Full name is required')
      .refine((val) => val.trim().includes(' '), {
        message: 'Please enter both first and last name (e.g. Sarah Jenkins)',
      }),
    adminEmail: z.string().email('Please enter a valid work email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type OnboardingFormData = z.infer<typeof OnboardingFormSchema>;

export interface OnboardingFormProps {
  onSuccess?: () => void;
}

/**
 * OnboardingForm component for initial company & administrator setup (ADR-012).
 */
export function OnboardingForm({ onSuccess }: OnboardingFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(OnboardingFormSchema),
    defaultValues: {
      companyName: '',
      fullName: '',
      adminEmail: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const watchedPassword = watch('password');

  const onSubmit = async (data: OnboardingFormData) => {
    setErrorMessage(null);

    // Split full name into first and last name
    const parts = data.fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || parts[0] || '';

    try {
      const response = await api.post<{
        company: { id: string; name: string };
        user: AuthUser;
        accessToken: string;
      }>('/auth/signup', {
        companyName: data.companyName.trim(),
        adminEmail: data.adminEmail.trim().toLowerCase(),
        password: data.password,
        firstName,
        lastName,
      });

      if (response && response.accessToken && response.user) {
        login({
          accessToken: response.accessToken,
          user: response.user,
        });

        if (onSuccess) {
          onSuccess();
        }

        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REGISTRATION_CLOSED' || err.status === 403) {
          setIsRegistrationClosed(true);
        } else if (err.code === 'CONFLICT' || err.status === 409) {
          setErrorMessage('An account with this email address already exists.');
        } else {
          setErrorMessage(err.message || 'Failed to complete registration.');
        }
      } else {
        setErrorMessage('A network error occurred. Please try again.');
      }
    }
  };

  if (isRegistrationClosed) {
    return (
      <div className="flex flex-col items-center text-center p-4">
        <div className="h-12 w-12 rounded-full bg-primary-tint flex items-center justify-center text-primary mb-4">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold font-display text-text-primary mb-2">
          Company Registration Complete
        </h3>
        <p className="text-sm text-text-secondary mb-6 max-w-sm">
          A company workspace has already been created for this instance. Employee accounts are
          created directly by Administrators or HR Officers.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/signin')}
          className="w-full max-w-xs font-semibold"
        >
          Proceed to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded bg-danger-soft border border-danger-border p-3 text-xs md:text-sm text-danger-dark font-medium animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Company Name */}
      <Input
        label="Company Name"
        placeholder="e.g. Acme Corporation"
        required
        error={errors.companyName?.message}
        {...register('companyName')}
      />

      {/* Full Name */}
      <Input
        label="Admin Full Name"
        placeholder="e.g. Sarah Jenkins"
        required
        error={errors.fullName?.message}
        {...register('fullName')}
      />

      {/* Work Email */}
      <Input
        label="Work Email"
        type="email"
        placeholder="admin@company.com"
        autoComplete="email"
        required
        error={errors.adminEmail?.message}
        {...register('adminEmail')}
      />

      {/* Password with Strength Meter */}
      <div>
        <PasswordField
          label="Password"
          placeholder="Create a strong password (min 8 chars)"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrength password={watchedPassword} />
      </div>

      {/* Confirm Password */}
      <PasswordField
        label="Confirm Password"
        placeholder="Confirm your password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full mt-2 font-semibold"
      >
        Create Company & Admin
      </Button>
    </form>
  );
}

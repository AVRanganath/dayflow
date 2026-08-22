'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authStore } from '../../lib/auth/auth-store';
import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/types';
import { Button } from '../../components/ui/Button';
import { PasswordField } from './PasswordField';
import { PasswordStrength } from './PasswordStrength';

const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type ChangePasswordFormData = z.infer<typeof ChangePasswordFormSchema>;

export interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

/**
 * ChangePasswordForm component for mandatory first-login password updates
 * (ADR-012) or account security management.
 */
export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
    mode: 'onTouched',
  });

  const watchedNewPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // Update in-memory user state to clear mustChangePassword
      const currentUser = authStore.getUser();
      if (currentUser) {
        authStore.setUser({
          ...currentUser,
          mustChangePassword: false,
        });
      }

      setSuccessMessage('Password changed successfully. Redirecting to dashboard...');

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Current password is incorrect.');
        } else {
          setErrorMessage(err.message || 'Failed to change password. Please try again.');
        }
      } else {
        setErrorMessage('A network error occurred. Please try again.');
      }
    }
  };

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

      {/* Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded bg-success-tint border border-success/30 p-3 text-xs md:text-sm text-success-dark font-medium animate-in fade-in duration-200"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Current Password */}
      <PasswordField
        label="Current Password"
        placeholder="Enter your current or temporary password"
        autoComplete="current-password"
        required
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />

      {/* New Password */}
      <div>
        <PasswordField
          label="New Password"
          placeholder="Create a new password (min 8 chars)"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordStrength password={watchedNewPassword} />
      </div>

      {/* Confirm New Password */}
      <PasswordField
        label="Confirm New Password"
        placeholder="Re-enter your new password"
        autoComplete="new-password"
        required
        error={errors.confirmNewPassword?.message}
        {...register('confirmNewPassword')}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full mt-2 font-semibold"
      >
        Update Password
      </Button>
    </form>
  );
}

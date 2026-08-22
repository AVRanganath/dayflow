'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { SigninSchema } from '@dayflow/shared';
import { useAuth, type AuthUser } from '../../lib/auth';
import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordField } from './PasswordField';

const SigninFormSchema = SigninSchema.extend({
  rememberMe: z.boolean().optional(),
});

type SigninFormData = z.infer<typeof SigninFormSchema>;

export interface SigninFormProps {
  onSuccess?: () => void;
}

/**
 * SigninForm component providing credential login (email or Login ID)
 * with inline validation and API error handling.
 */
export function SigninForm({ onSuccess }: SigninFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninFormData>({
    resolver: zodResolver(SigninFormSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: SigninFormData) => {
    setErrorMessage(null);
    try {
      const response = await api.post<{
        user: AuthUser;
        accessToken: string;
      }>('/auth/signin', {
        identifier: data.identifier.trim(),
        password: data.password,
      });

      if (response && response.accessToken && response.user) {
        login({
          accessToken: response.accessToken,
          user: response.user,
        });

        if (onSuccess) {
          onSuccess();
        }

        if (response.user.mustChangePassword) {
          router.push('/change-password');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS' || err.status === 401) {
          setErrorMessage('Invalid credentials. Please try again.');
        } else {
          setErrorMessage(err.message || 'Failed to sign in. Please try again.');
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

      {/* Email / Login ID Field */}
      <Input
        label="Email or Login ID"
        placeholder="e.g. admin@dayflow.com or OIJODO20220001"
        autoComplete="username"
        required
        error={errors.identifier?.message}
        {...register('identifier')}
      />

      {/* Password Field */}
      <PasswordField
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register('password')}
      />

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-text-secondary select-none cursor-pointer hover:text-text-primary">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary focus:ring-0"
            {...register('rememberMe')}
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => alert('Please contact your administrator to reset your password.')}
          className="font-medium text-text-secondary hover:text-primary hover:underline transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full mt-2 font-semibold"
      >
        Sign In
      </Button>
    </form>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Split-screen authentication layout matching Dayflow UI Design Spec PAGE 1 & PAGE 2.
 * Left panel: Plum brand gradient with Caveat Brush marker headline and decorative shapes.
 * Right panel: Centered auth forms (Signin, Onboarding, Change Password).
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.mustChangePassword) {
        if (pathname !== '/change-password') {
          router.replace('/change-password');
        }
      } else {
        if (pathname !== '/change-password') {
          router.replace('/dashboard');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-tint to-white p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[1040px] min-h-[600px] md:min-h-[700px] rounded-container bg-card border border-border shadow-auth overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Brand Panel (50% desktop, hidden on mobile) */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between p-10 lg:p-12 relative overflow-hidden bg-gradient-to-br from-[#714B67] to-[#2F1F2B] text-white select-none">
          {/* Top Wordmark */}
          <div className="z-10">
            <Link href="/signin" className="inline-block focus:outline-none">
              <span className="font-display font-extrabold text-[26px] tracking-tight text-white">
                Day<span className="text-secondary-on-dark">flow</span>
              </span>
            </Link>
          </div>

          {/* Center: Caveat Brush Headline + Subtitle */}
          <div className="relative z-10 my-auto py-8 max-w-[400px]">
            <h1 className="font-marker text-[48px] lg:text-[52px] leading-[1.08] text-white">
              Every workday,{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span
                  className="absolute inset-x-[-6px] top-[22%] bottom-[12%] bg-accent rounded-[3px] -z-10"
                  aria-hidden="true"
                />
                perfectly aligned.
              </span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-[#D6C4D1] max-w-[340px]">
              Streamlined attendance, instant leave workflows, transparent payroll, and automated
              employee operations.
            </p>
          </div>

          {/* Decorative Geometry */}
          <div
            className="w-[340px] h-[340px] rounded-full border-[60px] border-white/[0.07] absolute -right-20 -bottom-20 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="w-[120px] h-[120px] rounded-[24px] bg-white/[0.08] rotate-18 absolute right-14 bottom-28 pointer-events-none"
            aria-hidden="true"
          />

          {/* Bottom Footnote */}
          <div className="z-10 pt-4">
            <p className="font-marker text-[22px] text-secondary-on-dark -rotate-3">
              Trusted by 148 people at Dayflow
            </p>
          </div>
        </div>

        {/* Right Side: Form Viewport */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-card">
          {children}
        </div>
      </div>
    </div>
  );
}

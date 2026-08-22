'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { LayoutDashboard, CalendarCheck, CalendarDays, User, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  greeting?: string;
}

/**
 * Responsive AppShell composing the dark plum Sidebar, Header, Mobile Drawer,
 * Bottom Navigation (on phones), and the scrollable content canvas.
 */
export function AppShell({ children, title, greeting }: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();

  const mobileBottomNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { label: 'Leaves', href: '/leaves', icon: CalendarDays },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      {/* Desktop Sidebar (visible on lg screens and up) */}
      <div className="hidden lg:block lg:flex-shrink-0">
        <Sidebar className="sticky top-0 h-screen" />
      </div>

      {/* Mobile/Tablet Slide-over Drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#383E45]/60 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative z-10 flex h-full w-[260px] flex-col bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavClick={() => setIsMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
        <Header
          title={title}
          greeting={greeting}
          onToggleSidebar={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Mobile Bottom Navigation Bar (<768px) */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-border bg-card md:hidden">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default AppShell;

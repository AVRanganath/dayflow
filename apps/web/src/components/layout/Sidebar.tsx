'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  User,
  Users,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  Wallet,
  FileBarChart2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/useAuth';
import { Avatar } from '../ui/Avatar';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string;
}

export interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

/**
 * Shared Sidebar component in dark plum (#2F1F2B) per the Dayflow Design System.
 */
export function Sidebar({ onNavClick, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.role || 'EMPLOYEE';
  const isAdminOrHr = role === 'ADMIN' || role === 'HR';

  const employeeNavItems: NavItemConfig[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', href: '/profile', icon: User },
    { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { label: 'Leave Requests', href: '/leaves', icon: CalendarDays },
    { label: 'Payroll', href: '/payroll', icon: Wallet },
  ];

  const adminNavItems: NavItemConfig[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Employees', href: '/employees', icon: Users },
    { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { label: 'Leave Approvals', href: '/leaves/approvals', icon: CalendarClock },
    { label: 'Payroll', href: '/payroll', icon: Wallet },
    {
      label: 'Reports',
      href: '#',
      icon: FileBarChart2,
      disabled: true,
      badge: 'Coming Soon',
    },
  ];

  const navItems = isAdminOrHr ? adminNavItems : employeeNavItems;

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'User';

  return (
    <aside
      className={clsx(
        'flex h-full min-h-screen w-[260px] flex-col justify-between bg-sidebar text-white select-none',
        className,
      )}
    >
      <div>
        {/* Dayflow Wordmark */}
        <div className="px-5 py-6">
          <Link href="/dashboard" onClick={onNavClick} className="flex items-center gap-2 group">
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              Day<span className="text-secondary-on-dark">flow</span>
            </span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : !item.disabled && pathname.startsWith(item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded px-3 py-2.5 text-sm text-white/35 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-pill bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#D6C4D1]">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavClick}
                className={clsx(
                  'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-[#D6C4D1] hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2.5 mx-2 h-px bg-white/12" />

          {/* Secondary Nav */}
          <Link
            href="/settings"
            onClick={onNavClick}
            className={clsx(
              'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors duration-150',
              pathname === '/settings'
                ? 'bg-primary text-white font-semibold'
                : 'text-[#D6C4D1] hover:bg-white/10 hover:text-white',
            )}
          >
            <Settings className="h-[18px] w-[18px] flex-shrink-0" />
            <span>Settings</span>
          </Link>

          <button
            onClick={() => {
              onNavClick?.();
              logout();
            }}
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-[#D6C4D1] transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* User Card Footer */}
      <div className="m-3 flex items-center gap-3 rounded bg-white/5 p-3">
        <Avatar name={displayName} src={user?.avatarUrl} size="sm" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate text-[13px] font-semibold text-white">{displayName}</span>
          <div className="mt-0.5 flex items-center">
            <span className="rounded-pill bg-[rgba(113,75,103,0.55)] px-1.5 py-0.2 text-[10px] font-semibold text-secondary-on-dark">
              {role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

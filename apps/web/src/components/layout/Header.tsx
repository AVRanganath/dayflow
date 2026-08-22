'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, User as UserIcon, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/useAuth';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from './NotificationBell';

export interface HeaderProps {
  title?: string;
  greeting?: string;
  onToggleSidebar?: () => void;
}

/**
 * Header component featuring title slot, Caveat Brush marker greeting,
 * notification bell indicator, and user profile dropdown.
 */
export function Header({ title = 'Dashboard', greeting, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'User';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 md:px-8">
      {/* Left section: Hamburger (mobile/tablet) + Title & Greeting */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded text-text-secondary hover:bg-background lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex flex-col">
          <h1 className="font-display text-lg font-bold text-text-primary tracking-tight">
            {title}
          </h1>
          {greeting && <p className="font-marker text-base text-primary -mt-1">{greeting}</p>}
        </div>
      </div>

      {/* Right section: Notification Bell + Avatar Dropdown */}
      <div className="flex items-center gap-3">
        {/* Notification Bell (live data + dropdown) */}
        <NotificationBell />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded p-1 transition-colors hover:bg-background"
            aria-expanded={dropdownOpen}
          >
            <Avatar
              name={displayName}
              src={user?.avatarUrl}
              size="sm"
              workStatus={user?.workStatus}
            />
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-card border border-border bg-card p-1.5 shadow-modal animate-in fade-in zoom-in-95 duration-100">
              <div className="border-b border-hairline px-3 py-2">
                <p className="truncate text-xs font-bold text-text-primary">{displayName}</p>
                <p className="truncate text-[11px] text-text-secondary">{user?.email}</p>
                <span className="mt-1 inline-block rounded-pill bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {user?.role || 'EMPLOYEE'}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-primary-tint hover:text-primary"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-primary-tint hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </div>

              <div className="border-t border-hairline pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-[#FEF2F2]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useNotifications, type Notification } from '../../lib/notifications';

/**
 * Formats an ISO timestamp as a compact relative time
 * (e.g. "Just now", "5m ago", "3h ago", "Yesterday", "2 Aug").
 */
function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** A single row in the dropdown list. */
function NotificationRow({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (id: string) => void;
}) {
  const { id, title, body, isRead, createdAt } = notification;
  return (
    <button
      type="button"
      onClick={() => {
        if (!isRead) onSelect(id);
      }}
      className={clsx(
        'flex w-full items-start gap-2.5 rounded px-3 py-2.5 text-left transition-colors hover:bg-background',
        !isRead && 'bg-primary-tint/50',
      )}
    >
      {/* Unread dot / read placeholder to keep text aligned */}
      <span className="mt-1 flex h-2 w-2 flex-shrink-0 items-center justify-center">
        {!isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={clsx(
              'truncate text-xs',
              isRead ? 'font-medium text-text-secondary' : 'font-bold text-text-primary',
            )}
          >
            {title}
          </span>
          <span className="flex-shrink-0 text-[10px] text-text-muted">
            {relativeTime(createdAt)}
          </span>
        </span>
        {body && (
          <span className="mt-0.5 block text-[11px] leading-snug text-text-secondary line-clamp-2">
            {body}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Header notification bell: shows a red badge with the unread count (only when
 * `unreadCount > 0`) and opens a dropdown listing the user's notifications.
 *
 * Data comes from {@link useNotifications} (polls every 30s while
 * authenticated). Clicking a notification marks it read; a "Mark all read"
 * action clears every unread item. An empty state is shown when there are none.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded border border-border bg-card text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
        aria-label={hasUnread ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-card border border-border bg-card p-1.5 shadow-modal animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <p className="text-xs font-bold text-text-primary">Notifications</p>
            {hasUnread && (
              <button
                type="button"
                onClick={() => {
                  void markAllRead();
                }}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-tint"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List / empty state */}
          <div className="max-h-96 overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
                <Check className="h-6 w-6 text-text-muted" />
                <p className="text-xs font-medium text-text-primary">You&apos;re all caught up</p>
                <p className="text-[11px] text-text-secondary">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onSelect={(id) => {
                    void markRead(id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

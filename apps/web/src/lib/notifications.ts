'use client';

/**
 * Notifications data layer (S09).
 *
 * Wraps the S10 `api` client around the notification endpoints
 * (`GET /notifications/me`, `PATCH /notifications/:id/read`) and exposes a
 * polling React hook, {@link useNotifications}, for the header bell.
 *
 * The list endpoint's shape is not guaranteed — it may come back as a bare
 * array, an `{ items: [] }` envelope, or `null` when empty — so
 * {@link normalizeNotifications} coerces any of those into a plain array. No
 * `any`; the raw payload is typed as `unknown` and narrowed defensively.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api/client';
import { useAuth } from './auth/useAuth';

/** How often (ms) the bell re-polls `/notifications/me` while mounted. */
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

/** A single notification record as returned by `GET /notifications/me`. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

/** Possible envelope shape when the list is wrapped in `{ items: [] }`. */
interface NotificationListEnvelope {
  items?: Notification[];
}

/**
 * Coerces the loosely-typed `/notifications/me` payload into an array.
 *
 * Accepts a bare array, an `{ items: [] }` object, or `null`/`undefined`
 * (treated as empty). Anything else normalizes to an empty list.
 */
export function normalizeNotifications(data: unknown): Notification[] {
  if (Array.isArray(data)) {
    return data as Notification[];
  }
  if (data && typeof data === 'object') {
    const items = (data as NotificationListEnvelope).items;
    if (Array.isArray(items)) {
      return items;
    }
  }
  return [];
}

/** Fetch the caller's notifications (`GET /notifications/me`), normalized. */
export async function fetchNotifications(): Promise<Notification[]> {
  const data = await api.get<unknown>('/notifications/me');
  return normalizeNotifications(data);
}

/** Mark a single notification read (`PATCH /notifications/:id/read`). */
export async function markNotificationRead(id: string): Promise<void> {
  await api.patch<unknown>(`/notifications/${id}/read`);
}

/** The value returned by {@link useNotifications}. */
export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Loads the caller's notifications and keeps them fresh by polling every
 * {@link NOTIFICATION_POLL_INTERVAL_MS} while mounted.
 *
 * Only fetches when the user is authenticated (guards on
 * `useAuth().isAuthenticated`); clears its interval on unmount. `markRead` and
 * `markAllRead` update local state optimistically and roll back on failure.
 */
export function useNotifications(): UseNotificationsResult {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state so late-resolving fetches don't set state after unmount.
  const mountedRef = useRef(true);

  const refetch = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const next = await fetchNotifications();
      if (mountedRef.current) {
        setNotifications(next);
        setError(null);
      }
    } catch {
      if (mountedRef.current) {
        setError('Failed to load notifications');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  // Initial fetch + 30s polling, only while authenticated.
  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, refetch]);

  const markRead = useCallback(async (id: string): Promise<void> => {
    let previous: Notification[] = [];
    setNotifications((prev) => {
      previous = prev;
      return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    });
    try {
      await markNotificationRead(id);
    } catch {
      // Roll back the optimistic update on failure.
      if (mountedRef.current) {
        setNotifications(previous);
      }
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    let previous: Notification[] = [];
    let unreadIds: string[] = [];
    setNotifications((prev) => {
      previous = prev;
      unreadIds = prev.filter((n) => !n.isRead).map((n) => n.id);
      return prev.map((n) => (n.isRead ? n : { ...n, isRead: true }));
    });
    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
    } catch {
      if (mountedRef.current) {
        setNotifications(previous);
      }
    }
  }, []);

  const unreadCount = notifications.reduce((count, n) => (n.isRead ? count : count + 1), 0);

  return { notifications, unreadCount, isLoading, error, markRead, markAllRead, refetch };
}

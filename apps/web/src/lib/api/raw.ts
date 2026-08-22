/**
 * Envelope-aware GET helper.
 *
 * The S10 `api` client unwraps `{ success, data }` and discards `meta`, which is fine
 * for most calls but loses the cursor for paginated list endpoints. `getWithMeta`
 * performs the same authenticated GET (Bearer token + single-flight refresh on 401)
 * but returns the full `{ data, meta }` envelope so cursor pagination works.
 */
import { authStore } from '../auth/auth-store';
import { api } from './client';
import { ApiError, type ApiResponse, type ResponseMeta } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/** A paginated envelope: the row array plus optional pagination meta. */
export interface EnvelopePage<T> {
  data: T;
  meta?: ResponseMeta;
}

/**
 * Performs an authenticated GET and returns the raw `{ data, meta }` envelope.
 * Retries once after a silent token refresh on 401 (ADR-007).
 * @param path API path relative to the base URL.
 * @param params Optional query params (undefined/null are skipped).
 */
export async function getWithMeta<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  isRetry = false,
): Promise<EnvelopePage<T>> {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const headers = new Headers();
  const token = authStore.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !isRetry) {
    const newToken = await api.refresh();
    if (newToken) {
      return getWithMeta<T>(path, params, true);
    }
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
      window.location.href = '/signin';
    }
  }

  const json = (await response.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'An unexpected error occurred',
      json.error?.details,
      response.status,
    );
  }

  return { data: json.data, meta: json.meta };
}

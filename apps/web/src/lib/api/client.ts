import { authStore, type AuthUser } from '../auth/auth-store';
import { ApiError, type ApiResponse, type RequestOptions } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Single-flight refresh token promise to prevent multiple concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

/**
 * Executes a silent refresh call to POST /auth/refresh using the HttpOnly cookie.
 */
async function performTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        authStore.clearSession();
        return null;
      }

      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        user?: AuthUser;
      }>;

      if (json.success && json.data?.accessToken) {
        // Always persist the fresh access token, even before the user is known
        // (on a hard reload `/auth/refresh` returns only the token). The
        // AuthProvider then rehydrates the user from `/employees/me`.
        authStore.setToken(json.data.accessToken);
        if (json.data.user) {
          authStore.setUser(json.data.user);
        }
        return json.data.accessToken;
      }

      authStore.clearSession();
      return null;
    } catch {
      authStore.clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Main request executor that handles headers, cookies, token injection,
 * envelope unwrapping, and automatic 401 token refresh.
 */
async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const url = new URL(
    path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
  );

  if (options.params) {
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth) {
    const token = authStore.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
    body:
      options.body !== undefined
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
  };

  const response = await fetch(url.toString(), fetchOptions);

  // Handle 401 Unauthorized with auto-refresh (except for auth endpoints)
  const isAuthEndpoint =
    path.includes('/auth/signin') ||
    path.includes('/auth/signup') ||
    path.includes('/auth/refresh');

  if (response.status === 401 && !isAuthEndpoint && !isRetry) {
    const newToken = await performTokenRefresh();
    if (newToken) {
      // Retry the original request with the new access token
      return request<T>(path, options, true);
    } else {
      // Refresh failed; redirect to signin if running in the browser
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
        window.location.href = '/signin';
      }
    }
  }

  // Parse JSON response
  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiError(
        'HTTP_ERROR',
        `Request failed with status ${response.status}`,
        undefined,
        response.status,
      );
    }
    return undefined as unknown as T;
  }

  // Handle Dayflow envelope
  if (!json.success) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'An unexpected error occurred',
      json.error?.details,
      response.status,
    );
  }

  return json.data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  del: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),

  /**
   * Directly triggers a refresh token handshake.
   */
  refresh: performTokenRefresh,
};

export default api;

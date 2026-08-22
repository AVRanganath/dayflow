import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './client';
import { authStore } from '../auth/auth-store';
import { ApiError } from './types';

// Mock authStore
vi.mock('../auth/auth-store', () => ({
  authStore: {
    getAccessToken: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
    setToken: vi.fn(),
    setUser: vi.fn(),
    clearSession: vi.fn(),
  },
}));

describe('API Client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('unwraps success envelope correctly on GET', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } }),
    });

    const data = await api.get('/users/1');
    expect(data).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends auth token if available', async () => {
    vi.mocked(authStore.getAccessToken).mockReturnValue('token-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } }),
    });

    await api.get('/users/1');

    const fetchArgs = mockFetch.mock.calls[0]![1];
    expect(fetchArgs.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('throws ApiError when response is success: false', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Bad request', details: { field: 'err' } },
      }),
    });

    await expect(api.get('/bad')).rejects.toThrow(ApiError);
    await expect(api.get('/bad')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Bad request',
      details: { field: 'err' },
      status: 400,
    });
  });

  it('handles automatic 401 token refresh and retries the request', async () => {
    // 1st request: returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    });

    // 2nd request (refresh call): returns new token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { accessToken: 'new-token', user: { id: '1', role: 'EMPLOYEE' } },
      }),
    });

    // 3rd request (retry): returns success data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { success: 'yes' } }),
    });

    // On retry, it will get the new token from authStore
    vi.mocked(authStore.getAccessToken)
      .mockReturnValueOnce('old-token') // 1st call
      .mockReturnValueOnce('new-token'); // 3rd call (retry)

    const data = await api.get('/protected');

    expect(data).toEqual({ success: 'yes' });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // First call was to /protected
    expect(mockFetch.mock.calls[0]![0]).toContain('/protected');
    // Second call was to /auth/refresh
    expect(mockFetch.mock.calls[1]![0]).toContain('/auth/refresh');
    // Third call was to /protected with new token
    expect(mockFetch.mock.calls[2]![0]).toContain('/protected');
    expect(mockFetch.mock.calls[2]![1].headers.get('Authorization')).toBe('Bearer new-token');

    // Make sure authStore was updated: the token is always persisted, and the
    // user is set when the refresh response includes one.
    expect(authStore.setToken).toHaveBeenCalledWith('new-token');
    expect(authStore.setUser).toHaveBeenCalledWith({ id: '1', role: 'EMPLOYEE' });
  });

  it('clears session and redirects if refresh fails on 401', async () => {
    // We can't easily test window.location.href assignment in JSDOM/happy-dom this way without overriding
    // but we can test authStore.clearSession gets called

    // 1st request: returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    });

    // 2nd request (refresh call): also returns 401 (e.g. cookie expired)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    });

    try {
      await api.get('/protected');
    } catch {
      // Ignored
    }

    expect(authStore.clearSession).toHaveBeenCalled();
  });
});

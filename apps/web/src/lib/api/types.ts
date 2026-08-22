import type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  ResponseMeta,
  ApiErrorBody,
} from '@dayflow/shared';

export type { ApiResponse, SuccessResponse, ErrorResponse, ResponseMeta, ApiErrorBody };

/**
 * Custom error thrown by the API client when the server returns an error response
 * conforming to the Dayflow envelope (ADR-010).
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly status: number;

  constructor(code: string, message: string, details?: unknown, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * Options passed to the api client fetch requests.
 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  skipAuth?: boolean;
}

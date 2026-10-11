import type { ApiErrorCode } from '@/lib/shared/types';

/** Error carrying an HTTP status + stable code; converted to `{ error }` by the API helpers. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Sent as the `Retry-After` header (429 responses). */
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number },
  ) {
    super(message, options);
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new HttpError(400, 'BAD_REQUEST', message);
export const rateLimited = (message: string, retryAfterSeconds: number) =>
  new HttpError(429, 'RATE_LIMITED', message, { retryAfterSeconds });
export const notFound = (message: string) => new HttpError(404, 'NOT_FOUND', message);

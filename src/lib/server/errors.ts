import type { ApiErrorCode } from '@/lib/shared/types';

/** Error carrying an HTTP status + stable code; converted to `{ error }` by the API helpers. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new HttpError(400, 'BAD_REQUEST', message);
export const notFound = (message: string) => new HttpError(404, 'NOT_FOUND', message);

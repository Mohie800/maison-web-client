/**
 * The API returns NestJS's default error shape:
 *   { "message": "Unauthorized", "statusCode": 401 }
 * where `message` is a string for thrown exceptions but an array of strings for
 * validation failures. Both are normalised here so callers handle one shape.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  readonly path?: string;

  constructor(status: number, messages: string[], path?: string) {
    super(messages[0] ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.path = path;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Validation failures arrive as 400 with an array of field messages. */
  get isValidation() {
    return this.status === 400 && this.messages.length > 0;
  }
}

type RawError = { message?: string | string[]; statusCode?: number };

export function toApiError(
  status: number,
  body: unknown,
  path?: string,
): ApiError {
  const raw = (body ?? {}) as RawError;
  const messages = Array.isArray(raw.message)
    ? raw.message
    : raw.message
      ? [raw.message]
      : [];

  return new ApiError(raw.statusCode ?? status, messages, path);
}

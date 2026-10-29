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
  /** Machine-readable `code`, e.g. `BNPL_REJECTED`. Absent on Nest's default errors. */
  readonly code?: string;
  /** The raw error body, for codes that carry extra fields. */
  readonly body: Record<string, unknown>;

  constructor(
    status: number,
    messages: string[],
    path?: string,
    code?: string,
    body: Record<string, unknown> = {},
  ) {
    super(messages[0] ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.path = path;
    this.code = code;
    this.body = body;
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

type RawError = {
  message?: string | string[];
  statusCode?: number;
  code?: string;
};

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

  return new ApiError(
    raw.statusCode ?? status,
    messages,
    path,
    typeof raw.code === "string" ? raw.code : undefined,
    raw as Record<string, unknown>,
  );
}

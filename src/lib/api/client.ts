import { API_BASE_URL, API_PREFIX } from "./config";
import { toApiError } from "./errors";

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: QueryParams;
  body?: unknown;
  /** Bearer token. On the server, read from cookies and passed explicitly. */
  token?: string;
  /** Next.js fetch cache options (revalidate, tags). */
  next?: NextFetchRequestConfig;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(
    `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`,
    API_BASE_URL,
  );

  for (const [key, value] of Object.entries(params ?? {})) {
    // Drop empty values so filter state maps cleanly onto the query string.
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * The single entry point to the Maison API.
 *
 * Nothing should call `fetch` against the API directly — auth, error
 * normalisation, and query serialisation live here so they stay consistent.
 * Feature code calls the typed wrappers in `lib/api/endpoints/*`.
 */
export async function apiFetch<T>(
  path: string,
  { params, body, token, headers, next, ...init }: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, params);
  const isFormData = body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    next,
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. the "Hello World!" at GET /api). Keep the raw text.
      parsed = text;
    }
  }

  if (!response.ok) {
    throw toApiError(response.status, parsed, path);
  }

  return parsed as T;
}

/**
 * Offset-paginated envelope used by most list endpoints:
 *   { items, total, page, limit }
 * Messaging is the exception — it paginates newest-first by cursor.
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** The API returns no `hasMore`, so derive it. */
export function hasMore<T>(result: Paginated<T>): boolean {
  return result.page * result.limit < result.total;
}

import { toApiError } from "./errors";
import type { QueryParams } from "./client";

/**
 * Authenticated API calls from Client Components.
 *
 * Routed through the same-origin BFF at /api/proxy, which attaches the bearer
 * token from the httpOnly cookies and handles refresh-and-retry. The browser
 * never sees a token.
 *
 * Public, non-personalised data should be fetched in a Server Component
 * instead — that renders on the server, is cacheable, and is crawlable.
 */

export interface BrowserRequestOptions extends Omit<RequestInit, "body"> {
  params?: QueryParams;
  body?: unknown;
}

export async function browserApiFetch<T>(
  path: string,
  { params, body, headers, ...init }: BrowserRequestOptions = {},
): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}${
    query ? `?${query}` : ""
  }`;

  const isFormData = body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(!isFormData && body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body: isFormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) throw toApiError(response.status, parsed, path);

  return parsed as T;
}

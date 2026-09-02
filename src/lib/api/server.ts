import "server-only";
import { apiFetch, type RequestOptions } from "./client";
import { getAccessToken } from "@/lib/auth/session";

/**
 * Authenticated API calls from Server Components and Server Actions.
 *
 * Goes straight to the API with the token read from cookies — no BFF hop, since
 * we are already on the server.
 *
 * Note this does NOT refresh on 401. A Server Component cannot write cookies
 * during render, so a rotated token could not be persisted. Instead a 401 here
 * surfaces as an ApiError; `requireSession()` in lib/auth/require-session.ts
 * turns that into a redirect to sign-in. Client-side traffic goes through
 * /api/proxy, which does refresh and persist.
 */
export async function serverApiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getAccessToken();
  return apiFetch<T>(path, {
    ...options,
    token,
    // Authenticated responses are user-specific and must never be cached.
    cache: options.cache ?? "no-store",
  });
}

/**
 * Public data that gains a viewer-scoped field when there is a session.
 *
 * `GET /listings` and its siblings are public routes that answer one extra key
 * per row for a caller they can identify — `isLiked`, the viewer's own like
 * (GAP-100). Signed out, the request goes out anonymous and stays in the shared
 * cache; signed in it carries the token and is `no-store`, because a cached
 * copy of one person's hearts is exactly the thing that must not be shared.
 *
 * The caller's `next` options are dropped on the authenticated path — a
 * revalidate window alongside `no-store` is a conflict, and tags cannot
 * invalidate what was never stored.
 */
export async function viewerApiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) return apiFetch<T>(path, options);

  const rest = { ...options };
  delete rest.next;
  return apiFetch<T>(path, { ...rest, token, cache: "no-store" });
}

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

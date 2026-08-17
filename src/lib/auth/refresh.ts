import "server-only";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { refreshSchema } from "@/lib/api/schemas/auth";
import type { AuthSession } from "@/lib/api/schemas/auth";

/**
 * Single-flight refresh.
 *
 * The API rotates refresh tokens: each successful refresh invalidates the one
 * that was used (verified — replaying a consumed token returns 401). If two
 * requests 401 at once and both call refresh, the second uses an
 * already-consumed token, gets 401, and the user is silently logged out.
 *
 * So concurrent refreshes for the same token collapse onto one in-flight
 * promise and share its result.
 *
 * Caveat: this is per server instance. Across multiple instances or a
 * serverless deployment, two concurrent refreshes can still race. The real fix
 * is a short grace window server-side where the previous token stays valid —
 * raised with the backend as API-19.
 */
const inFlight = new Map<string, Promise<AuthSession | null>>();

export async function refreshSession(
  refreshToken: string,
): Promise<AuthSession | null> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const promise = (async (): Promise<AuthSession | null> => {
    try {
      const data = await apiFetch<unknown>("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
        cache: "no-store",
      });
      const parsed = refreshSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    } catch (error) {
      // A rejected refresh token is terminal — the caller must sign in again.
      if (error instanceof ApiError && error.isUnauthorized) return null;
      throw error;
    } finally {
      // Always release, so a failed refresh doesn't poison later attempts.
      inFlight.delete(refreshToken);
    }
  })();

  inFlight.set(refreshToken, promise);
  return promise;
}

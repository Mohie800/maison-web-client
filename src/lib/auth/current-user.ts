import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { userSchema, type User } from "@/lib/api/schemas/auth";
import { getAccessToken } from "./session";

/**
 * The signed-in user, or null.
 *
 * Wrapped in React's `cache` so multiple components in one render share a
 * single GET /users/me rather than each issuing their own.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const data = await serverApiFetch<unknown>("/users/me");
    const parsed = userSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    // An expired or revoked token reads as signed-out rather than an error page.
    if (error instanceof ApiError && error.isUnauthorized) return null;
    throw error;
  }
});

/**
 * For gated Server Components. `proxy.ts` already blocks unauthenticated
 * visitors, so reaching here without a session means the token was rejected —
 * send them to sign in.
 */
export async function requireUser(locale: string, returnTo?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/${locale}/sign-in${next}`);
  }
  return user;
}

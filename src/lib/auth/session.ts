import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./constants";

/**
 * Session cookie read/write. Server-only — the `server-only` import makes it a
 * build error to pull this into a Client Component.
 *
 * Tokens are httpOnly so browser JavaScript can never read them. That is the
 * point: the site renders user-generated listings, reviews, and messages, and a
 * rotating refresh token readable by JS would be a single XSS away from full
 * account takeover.
 */

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * The access JWT carries no `exp` claim (verified 2026-08-17 — the payload is
 * only `{ sub, iat }`), so there is no server-defined lifetime to mirror here.
 * These are the cookie lifetimes we impose on the client. Flagged to the
 * backend as API-18.
 */
const ACCESS_MAX_AGE = 60 * 60 * 24; // 1 day
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSessionCookies(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_BASE,
    maxAge: ACCESS_MAX_AGE,
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...COOKIE_BASE,
    maxAge: REFRESH_MAX_AGE,
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  return Boolean(await getAccessToken());
}

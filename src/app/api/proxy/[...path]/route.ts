import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL, API_PREFIX } from "@/lib/api/config";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import { refreshSession } from "@/lib/auth/refresh";

/**
 * Authenticated pass-through to the Maison API for Client Components.
 *
 * Browser JavaScript cannot read the httpOnly session cookies, so client-side
 * queries and mutations go through this same-origin route, which attaches the
 * bearer token server-side. On a 401 it refreshes once, retries, and writes the
 * rotated tokens back to the cookies.
 *
 * Server Components do NOT use this — they call the API directly with the token
 * read from cookies (lib/api/server.ts), avoiding a pointless extra hop.
 */

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language"];
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

async function handler(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const target = new URL(
    `${API_PREFIX}/${path.join("/")}`,
    API_BASE_URL,
  );
  target.search = request.nextUrl.search;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Body is read once and reused for the post-refresh retry.
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const send = (token: string | undefined) => {
    const outbound = new Headers(headers);
    if (token) outbound.set("Authorization", `Bearer ${token}`);
    return fetch(target, {
      method: request.method,
      headers: outbound,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  };

  let upstream = await send(accessToken);
  let rotated: { accessToken: string; refreshToken: string } | null = null;

  if (upstream.status === 401 && refreshToken) {
    const session = await refreshSession(refreshToken);
    if (session) {
      rotated = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
      upstream = await send(session.accessToken);
    }
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (rotated) {
    const base = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookies.set(ACCESS_TOKEN_COOKIE, rotated.accessToken, {
      ...base,
      maxAge: 60 * 60 * 24,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, rotated.refreshToken, {
      ...base,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Refresh failed and the session is unrecoverable — clear it so the next
  // navigation is gated rather than looping through failed refreshes.
  if (upstream.status === 401 && !rotated) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }

  return response;
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
};

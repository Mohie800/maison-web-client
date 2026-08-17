import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { ACCESS_TOKEN_COOKIE, PROTECTED_PREFIXES } from "@/lib/auth/constants";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. Same
 * behaviour, different filename and export.
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */

const intlProxy = createIntlMiddleware(routing);

/** Strips the leading /en or /ar so route matching is locale-agnostic. */
function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const route = pathWithoutLocale(pathname);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );

  /**
   * Gate on the server. A client-side redirect would render the gated page
   * first, which leaks its shell and flashes protected UI.
   *
   * The cookie's presence is checked, not its validity — verifying the JWT here
   * would mean a crypto operation on every request. An expired token is caught
   * by the API client, which refreshes and retries. This only stops
   * unauthenticated visitors from reaching gated routes at all.
   */
  if (isProtected && !request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    const locale =
      routing.locales.find(
        (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
      ) ?? routing.defaultLocale;

    const signIn = new URL(`/${locale}/sign-in`, request.url);
    signIn.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return intlProxy(request);
}

export const config = {
  /**
   * Skip API routes, Next internals, and anything with a file extension
   * (static assets), so the locale rewrite only runs on real pages.
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

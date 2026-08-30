/**
 * Session cookie names. The BFF route handlers (app/api/auth/*) own writing
 * these; nothing else should set them.
 *
 * Tokens live in httpOnly cookies rather than localStorage because Server
 * Components need to read them to render gated pages, and because the API's
 * refresh tokens rotate — a rotating refresh token in localStorage is exposed
 * to any XSS on a site that renders user-generated listings and messages.
 * See plans/02-api-integration.md.
 */
export const ACCESS_TOKEN_COOKIE = "maison_at";
export const REFRESH_TOKEN_COOKIE = "maison_rt";

/**
 * Route prefixes that require a session, matched after the locale segment is
 * stripped. Keep in sync with the (account) and (commerce) route groups.
 */
export const PROTECTED_PREFIXES = [
  "/account",
  "/sell",
  "/cart",
  "/checkout",
  "/inbox",
  /*
    The trade hub itself is public — `651:6008` is a browse page, and the header
    lists Trade beside Categories and Brands for signed-out visitors. Making an
    offer is not: both sub-routes below also call `requireUser`, so this is the
    outer guard rather than the only one.
  */
  "/trade/offer",
  "/trade/sent",
  "/onboarding",
] as const;

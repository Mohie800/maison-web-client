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
  /*
    The Vendor Portal is gated on a session and nothing more. Every
    `/vendor-portal/*` route answers 200 for an `accountType: individual`
    account, so the portal is scoped to "any seller" rather than to business
    accounts — confirmed against dev 2026-09-05 and raised as the opening note
    of API-GAPS-ROUND-9. A seller with no listings sees zeros, which is the
    right first-run state; a hard gate on listing count would hide the portal
    from exactly the people about to use it.
  */
  "/vendor",
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

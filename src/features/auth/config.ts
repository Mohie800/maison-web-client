/**
 * Social sign-in.
 *
 * The design (Figma 651:16440) shows "Continue with Google" and "Continue with
 * Apple". Which buttons to draw comes from `GET /auth/social/config`
 * (`getSocialAuthConfig()` in lib/api/endpoints/settings.ts), not a build flag:
 * that endpoint lists only the providers the environment can actually serve.
 *
 * It reads `{ enabled: false, switchedOff: false, providers: [] }` today — the
 * feature is on, the client ids are not configured (GAP-48) — so the row falls
 * back to the phone alternative.
 */
export type SocialProvider = "google" | "apple";

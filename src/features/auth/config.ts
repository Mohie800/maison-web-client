/**
 * Social sign-in.
 *
 * The design (Figma 651:16440) shows "Continue with Google" and "Continue with
 * Apple". The API has no OAuth endpoints — `/auth/*` is email/phone + password
 * only — so these are off. Raised as GAP-28.
 *
 * Flip this to true once the backend exposes OAuth; the markup and layout are
 * already written against it.
 */
export const SOCIAL_AUTH_ENABLED = false;

/**
 * OTP lifetime shown in the "Code expires in mm:ss" countdown.
 *
 * ⚠️ A client-side assumption. Neither `POST /auth/register` nor
 * `/auth/resend-otp` returns an expiry — the response is
 * `{ userId, channel, destination, message }` — so five minutes is a guess
 * based on the design's "04:32". If the real window is shorter, the countdown
 * will still be running when the code stops working (the user gets a clear API
 * error either way); if it's longer, we prompt a resend early.
 *
 * Raised with the backend as GAP-29 — asking for `expiresAt` on those responses.
 */
export const OTP_EXPIRY_SECONDS = 5 * 60;

import { z } from "zod";

/**
 * Verified against the live API on 2026-08-17 by registering a throwaway
 * account. The OpenAPI spec documents no response bodies (plans/06 G10), so
 * these are derived from observed responses.
 */

export const userSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  accountType: z.enum(["individual", "business"]),
  role: z.string(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  profilePic: z.string().nullable(),
  dob: z.string().nullable(),
  gender: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  notifyPriceDrops: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  phoneVerifiedAt: z.string().nullable(),
  termsAcceptedAt: z.string().nullable(),
  profileCompleted: z.boolean(),
  /**
   * Vacation mode. The fields exist on the user model but no request DTO
   * exposes writing them — see plans/API-GAPS-FOR-BACKEND.md (API-10).
   */
  holidayMode: z.boolean(),
  holidayModeUntil: z.string().nullable(),
  holidayModeNote: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

/** Returned by POST /auth/login and POST /auth/verify-otp. */
export const authSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  profileCompleted: z.boolean(),
  user: userSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

/**
 * Returned by POST /auth/register and, since GAP-29, by POST /auth/resend-otp
 * in the same shape. Note it does NOT return tokens — the user is not
 * authenticated until they verify the OTP, and `userId` is what verify-otp
 * needs.
 *
 * `expiresAt` is read off the persisted row, so the countdown can't desync from
 * the code. `resendAvailableAt` is enforced as well as reported: a resend
 * inside the window is a 400.
 */
export const registrationSchema = z.object({
  userId: z.string(),
  channel: z.enum(["email", "phone"]),
  destination: z.string(),
  message: z.string(),
  expiresAt: z.string().nullish(),
  expiresInSeconds: z.number().nullish(),
  resendAvailableAt: z.string().nullish(),
  resendCooldownSeconds: z.number().nullish(),
});

export type Registration = z.infer<typeof registrationSchema>;

/**
 * POST /auth/refresh returns the same full session shape as login — not a
 * reduced token pair.
 *
 * Rotation is enforced server-side: replaying a consumed refresh token returns
 * 401 "Invalid refresh token" (verified 2026-08-17). Two concurrent refreshes
 * would therefore destroy the session, which is why refresh must be
 * single-flight. See lib/auth/refresh.ts.
 */
export const refreshSchema = authSessionSchema;

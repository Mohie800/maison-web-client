import { toApiError } from "@/lib/api/errors";
import type { Registration, User } from "@/lib/api/schemas/auth";

/**
 * Client-side auth calls. These target the BFF at /api/auth/* rather than the
 * Maison API directly, because only the server can set the httpOnly session
 * cookies.
 */

export interface SessionResult {
  user: User;
  profileCompleted: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) throw toApiError(response.status, data, path);

  return data as T;
}

export const authApi = {
  signIn: (body: { email?: string; phoneNumber?: string; password: string }) =>
    post<SessionResult>("login", body),

  register: (body: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    password: string;
    acceptedTerms: true;
    accountType?: "individual" | "business";
  }) => post<Registration>("register", body),

  verifyOtp: (body: { userId: string; code: string }) =>
    post<SessionResult>("verify-otp", body),

  /** Same shape as register, `userId` included — GAP-29. */
  resendOtp: (body: { userId: string }) => post<Registration>("resend-otp", body),

  forgotPassword: (body: { email: string }) =>
    post<unknown>("forgot-password", body),

  resetPassword: (body: { token: string; password: string }) =>
    post<unknown>("reset-password", body),

  signOut: () => post<{ ok: boolean }>("logout", {}),
};

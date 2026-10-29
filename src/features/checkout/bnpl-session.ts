import "server-only";
import { cookies } from "next/headers";

/** Remembers the BNPL attempt across the provider redirect, in case the return URL loses its query. */
const COOKIE = "maison_bnpl";
const MAX_AGE = 60 * 60; // the reservation lasts 30 min

export interface BnplAttempt {
  sessionId: string;
  /** The payment step to send the buyer back to on cancel or failure. */
  returnTo: string;
}

export async function rememberBnplAttempt(attempt: BnplAttempt): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(attempt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readBnplAttempt(): Promise<BnplAttempt | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BnplAttempt>;
    if (typeof parsed.sessionId !== "string") return null;
    return {
      sessionId: parsed.sessionId,
      returnTo: safePaymentStep(parsed.returnTo),
    };
  } catch {
    return null;
  }
}

/** Only ever the payment step — the value round-trips through a form field and a cookie. */
export function safePaymentStep(value: unknown): string {
  return typeof value === "string" && value.startsWith("/checkout/payment?")
    ? value
    : "/cart";
}

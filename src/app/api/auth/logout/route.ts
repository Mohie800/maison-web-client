import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";

/**
 * The API exposes no logout/revoke endpoint, so this only clears the client
 * session. The refresh token stays valid server-side until it is rotated or
 * expires — raised with the backend as API-20.
 */
export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}

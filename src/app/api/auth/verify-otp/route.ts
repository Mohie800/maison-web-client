import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { authSessionSchema } from "@/lib/api/schemas/auth";
import { toErrorResponse } from "@/lib/api/route-helpers";
import { setSessionCookies } from "@/lib/auth/session";

/**
 * Verifying the OTP is what actually authenticates a registration — the
 * register call returns only a `userId`, no tokens.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await apiFetch<unknown>("/auth/verify-otp", {
      method: "POST",
      body,
      cache: "no-store",
    });

    const session = authSessionSchema.parse(data);
    await setSessionCookies(session);

    return NextResponse.json({
      user: session.user,
      profileCompleted: session.profileCompleted,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

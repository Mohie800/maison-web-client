import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { authSessionSchema } from "@/lib/api/schemas/auth";
import { toErrorResponse } from "@/lib/api/route-helpers";
import { setSessionCookies } from "@/lib/auth/session";

/**
 * Exchanges credentials for a session, then stores the tokens in httpOnly
 * cookies. The tokens are never returned to the browser — only the user object
 * and `profileCompleted`, which the client needs for routing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await apiFetch<unknown>("/auth/login", {
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

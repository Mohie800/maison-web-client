import "server-only";
import { NextResponse } from "next/server";
import { apiFetch } from "./client";
import { ApiError } from "./errors";

/**
 * Shared plumbing for the BFF auth route handlers.
 *
 * Each handler is deliberately thin: forward the request, normalise errors, and
 * (where a session is issued) set httpOnly cookies. Business logic stays on the
 * API.
 */

export interface RouteErrorBody {
  message: string;
  messages: string[];
  status: number;
}

export function toErrorResponse(error: unknown): NextResponse<RouteErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        message: error.message,
        messages: error.messages,
        status: error.status,
      },
      { status: error.status },
    );
  }

  console.error("[auth] unexpected error", error);
  return NextResponse.json(
    {
      message: "Something went wrong. Please try again.",
      messages: [],
      status: 500,
    },
    { status: 500 },
  );
}

/** Forwards a JSON POST to the API and returns its response verbatim. */
export async function forwardPost(
  path: string,
  body: unknown,
): Promise<NextResponse> {
  try {
    const data = await apiFetch<unknown>(path, {
      method: "POST",
      body,
      cache: "no-store",
    });
    return NextResponse.json(data ?? {});
  } catch (error) {
    return toErrorResponse(error);
  }
}

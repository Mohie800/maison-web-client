import { type NextRequest } from "next/server";
import { forwardPost } from "@/lib/api/route-helpers";

/** Pass-through: no session is issued, so no cookies are set here. */
export async function POST(request: NextRequest) {
  return forwardPost("/auth/forgot-password", await request.json());
}

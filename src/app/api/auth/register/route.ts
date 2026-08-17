import { type NextRequest } from "next/server";
import { forwardPost } from "@/lib/api/route-helpers";

/**
 * Registration issues no tokens — it returns { userId, channel, destination }
 * and sends an OTP. The client carries `userId` to the verify step.
 */
export async function POST(request: NextRequest) {
  return forwardPost("/auth/register", await request.json());
}

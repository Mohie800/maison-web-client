import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  returnEligibilitySchema,
  returnRequestSchema,
  returnsListSchema,
} from "../schemas/return";

/** Buyer-side returns. All require a session. */

export async function getReturnEligibility(orderId: string) {
  const data = await serverApiFetch<unknown>(
    `/returns/eligibility/${orderId}`,
    { cache: "no-store" },
  );
  return parseResponse(
    returnEligibilitySchema,
    data,
    "GET /returns/eligibility/{orderId}",
  );
}

export async function getReturns() {
  const data = await serverApiFetch<unknown>("/returns", { cache: "no-store" });
  return parseResponse(returnsListSchema, data, "GET /returns");
}

/** Null when the id isn't the viewer's return. */
export async function getReturn(id: string) {
  try {
    const data = await serverApiFetch<unknown>(`/returns/${id}`, {
      cache: "no-store",
    });
    return parseResponse(returnRequestSchema, data, "GET /returns/{id}");
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

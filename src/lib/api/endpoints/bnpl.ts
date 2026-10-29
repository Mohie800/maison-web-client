import "server-only";
import { z } from "zod";
import { apiFetch } from "../client";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  bnplOptionSchema,
  paymentSessionSchema,
  type BnplOption,
  type PaymentSession,
} from "../schemas/bnpl";

/** Public. Depends on the total, so it's never cached; an empty list on failure hides the rows. */
export async function getBnplOptions(
  amount: string | number | null,
): Promise<BnplOption[]> {
  if (amount === null || !(Number(amount) > 0)) return [];
  try {
    const data = await apiFetch<unknown>("/payments/bnpl/options", {
      params: { amount: String(amount) },
      cache: "no-store",
    });
    return parseResponse(
      z.array(bnplOptionSchema),
      data,
      "GET /payments/bnpl/options",
    );
  } catch {
    return [];
  }
}

/** Owner-only: 404 for someone else's session. */
export async function getBnplSession(id: string): Promise<PaymentSession> {
  const data = await serverApiFetch<unknown>(
    `/payments/bnpl/sessions/${encodeURIComponent(id)}`,
  );
  return parseResponse(
    paymentSessionSchema,
    data,
    "GET /payments/bnpl/sessions/{id}",
  );
}

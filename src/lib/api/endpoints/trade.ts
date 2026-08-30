import "server-only";
import { z } from "zod";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";

/**
 * Trade — only the badge counts so far. The screens are Flow 6 and unbuilt,
 * but `GET /trade-requests/counts` is what the dashboard's Trade Offers stat
 * needs, and it exists.
 */
const tradeCountsSchema = z.object({
  received: z.number().nullish(),
  sent: z.number().nullish(),
  history: z.number().nullish(),
});

export async function getTradeRequestCounts() {
  const data = await serverApiFetch<unknown>("/trade-requests/counts", {
    cache: "no-store",
  });
  return parseResponse(tradeCountsSchema, data, "GET /trade-requests/counts");
}

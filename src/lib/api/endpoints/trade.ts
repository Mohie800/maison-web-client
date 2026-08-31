import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  tradeClosetSchema,
  tradeCountsSchema,
  tradeRequestDetailSchema,
  tradeRequestListSchema,
  tradeSuggestionListSchema,
  type TradeStatus,
  type TradeSuggestionFilter,
} from "../schemas/trade";

/**
 * Trade reads — Flow 6.
 *
 * The endpoint is `/trade-requests`, not `/trade/requests`; only the closet and
 * suggestions sit under `/trade`.
 */

export async function getTradeRequestCounts() {
  const data = await serverApiFetch<unknown>("/trade-requests/counts", {
    cache: "no-store",
  });
  return parseResponse(tradeCountsSchema, data, "GET /trade-requests/counts");
}

export interface TradeRequestQuery {
  role?: "sent" | "received";
  status?: TradeStatus;
  page?: number;
  limit?: number;
}

export async function getTradeRequests(query: TradeRequestQuery = {}) {
  const data = await serverApiFetch<unknown>("/trade-requests", {
    params: { ...query },
    cache: "no-store",
  });
  return parseResponse(tradeRequestListSchema, data, "GET /trade-requests");
}

export async function getTradeRequest(id: string) {
  const data = await serverApiFetch<unknown>(`/trade-requests/${id}`, {
    cache: "no-store",
  });
  return parseResponse(
    tradeRequestDetailSchema,
    data,
    "GET /trade-requests/{id}",
  );
}

/** Your own live trade-mode listings. A bare array, not a page. */
export async function getTradeCloset() {
  const data = await serverApiFetch<unknown>("/trade/closet", {
    cache: "no-store",
  });
  return parseResponse(tradeClosetSchema, data, "GET /trade/closet");
}

export async function getTradeSuggestions(
  filter?: TradeSuggestionFilter,
  page = 1,
) {
  const data = await serverApiFetch<unknown>("/trade/suggestions", {
    params: { filter, page, limit: 24 },
    cache: "no-store",
  });
  return parseResponse(
    tradeSuggestionListSchema,
    data,
    "GET /trade/suggestions",
  );
}

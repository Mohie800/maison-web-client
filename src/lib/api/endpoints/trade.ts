import "server-only";
import { apiFetch } from "../client";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import type { Listing } from "../schemas/listing";
import { paginatedListingsSchema } from "../schemas/listing";
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

/**
 * Photos and titles for listings the trade payloads name by id only (GAP-83).
 *
 * `/trade/suggestions` returns `{id, sellerId, categoryId, brandId, value, city}`
 * per side, `/trade/closet` returns listing columns with no `photos`, and the
 * `offerItems` on a trade request carry an id and a value. None of them can fill
 * an item card. `GET /listings` does return `photos`, `seller` and `brand`, so
 * one call over the trade-mode catalogue backfills every id the page needs.
 *
 * Two calls, because a listing leaves `live` for `traded` once a swap completes
 * and history still has to render it. Both are capped at the API's own limit of
 * 100, which covers the current catalogue several times over — this stops being
 * enough long before it stops being correct, hence the gap.
 *
 * Uncached, unlike the catalogue reads it borrows. This resolves specific ids
 * rather than filling a grid, and one of them is often seconds old: with the
 * usual `revalidate: 60` the confirmation page for an offer you just sent
 * renders its own item as "unavailable" from a stale page.
 */
export async function getTradeListingIndex(): Promise<Map<string, Listing>> {
  const fetchPage = async (status: string) => {
    const data = await apiFetch<unknown>("/listings", {
      params: { saleMode: "trade", status, limit: 100 },
      cache: "no-store",
    });
    return parseResponse(
      paginatedListingsSchema,
      data,
      `GET /listings?saleMode=trade&status=${status}`,
    ).items;
  };

  const [live, traded] = await Promise.all([
    fetchPage("live"),
    fetchPage("traded"),
  ]);

  return new Map([...live, ...traded].map((row) => [row.id, row]));
}

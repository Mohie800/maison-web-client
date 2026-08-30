import "server-only";
import { apiFetch } from "../client";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  auctionPaymentSchema,
  auctionStatsSchema,
  auctionStatusSchema,
  myBidsSchema,
  type MyBidStatus,
} from "../schemas/auction";

/**
 * Auction reads. Every one of these needs a session — including
 * `auction-status`, which answers anonymously since GAP-66 landed and carries
 * nothing private (GAP-66). Callers fall back to the listing's own snapshot.
 */

export async function getAuctionStatus(listingId: string) {
  const data = await serverApiFetch<unknown>(
    `/listings/${listingId}/auction-status`,
    { cache: "no-store" },
  );
  return parseResponse(
    auctionStatusSchema,
    data,
    "GET /listings/{id}/auction-status",
  );
}

export async function getMyBids(tab?: MyBidStatus) {
  // The parameter is `tab`, not `status` — the API rejects anything it does
  // not whitelist with a 400 rather than ignoring it.
  const query = tab ? `?tab=${tab}` : "";
  const data = await serverApiFetch<unknown>(`/me/bids${query}`, {
    cache: "no-store",
  });
  return parseResponse(myBidsSchema, data, "GET /me/bids");
}

/** Null when no payment is due — the API 404s with a message rather than 200. */
export async function getAuctionPayment(listingId: string) {
  try {
    const data = await serverApiFetch<unknown>(
      `/listings/${listingId}/auction-payment`,
    );
    return parseResponse(
      auctionPaymentSchema,
      data,
      "GET /listings/{id}/auction-payment",
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/**
 * Hero counters — public, unlike everything else here, and short-lived: the
 * numbers move as people bid.
 */
export async function getAuctionStats() {
  const data = await apiFetch<unknown>("/auctions/stats", {
    next: { revalidate: 60, tags: ["auctions"] },
  });
  return parseResponse(auctionStatsSchema, data, "GET /auctions/stats");
}

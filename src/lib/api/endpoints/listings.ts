import { apiFetch } from "../client";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import { listingSchema, paginatedListingsSchema } from "../schemas/listing";

export interface ListingQuery {
  page?: number;
  limit?: number;
  status?: string;
  condition?: string;
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  search?: string;
  saleMode?: "fixed" | "negotiable" | "auction" | "trade";
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  country?: string;
  /** Backend shipped the wider set; `ending_soon` needs saleMode=auction. */
  sort?:
    | "price_asc"
    | "price_desc"
    | "created_at_desc"
    | "created_at_asc"
    | "popular"
    | "views_desc"
    | "ending_soon"
    | "discount_desc"
    | "rating_desc";
}

/**
 * GET /listings.
 *
 * `saleMode`, price range, city/country and the wider sort set all landed in the
 * backend's gaps drop and are verified working. Two caveats remain: `materialId`
 * 500s for every value, and `specialTags` / `minDiscountPercent` return a `total`
 * that ignores the filter (BUG-01, BUG-02 in API-GAPS-ROUND-2). Don't add query
 * params speculatively — unknown ones are ignored server-side, which reads as a
 * filter that silently does nothing.
 */
export async function getListings(query: ListingQuery = {}) {
  const data = await apiFetch<unknown>("/listings", {
    params: { status: "live", ...query },
    next: { revalidate: 60, tags: ["listings"] },
  });
  return parseResponse(paginatedListingsSchema, data, "GET /listings");
}

/**
 * A single listing for the product page.
 *
 * ⚠️ `GET /listings/{id}` currently returns 500 for every existing listing
 * (verified 2026-08-17 across multiple ids, anonymous and authenticated; a
 * non-existent id correctly returns 404, so the route resolves and then throws).
 * Reported as API-24.
 *
 * Until it's fixed, this falls back to locating the same record through
 * `GET /listings`, which works. That is the same entity from a working
 * endpoint — not invented data — but it is a workaround with real limits:
 * it scans a bounded number of pages, so a listing beyond that window will
 * 404 in the UI even though it exists.
 *
 * Delete `findListingViaList` and the try/catch the day API-24 lands.
 */
export async function getListing(id: string) {
  try {
    const data = await apiFetch<unknown>(`/listings/${id}`, {
      next: { revalidate: 60, tags: ["listings", `listing:${id}`] },
    });
    return parseResponse(listingSchema, data, `GET /listings/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;

    console.error(
      `[api] GET /listings/${id} failed (${
        error instanceof ApiError ? error.status : "unknown"
      }) — falling back to list scan. See API-24.`,
    );
    return findListingViaList(id);
  }
}

const FALLBACK_PAGE_SIZE = 100;
const FALLBACK_MAX_PAGES = 3;

async function findListingViaList(id: string) {
  for (let page = 1; page <= FALLBACK_MAX_PAGES; page++) {
    const result = await getListings({ page, limit: FALLBACK_PAGE_SIZE });
    const match = result.items.find((item) => item.id === id);
    if (match) return match;
    if (result.page * result.limit >= result.total) break;
  }
  return null;
}

/** Same category, excluding the current listing — "You may also like". */
export async function getRelatedListings(
  listing: { id: string; categoryId?: string | null },
  limit = 4,
) {
  const result = await getListings({
    categoryId: listing.categoryId ?? undefined,
    limit: limit + 1,
  });
  return result.items.filter((item) => item.id !== listing.id).slice(0, limit);
}

/**
 * Live auctions, soonest to end first.
 *
 * Previously unbuildable — this needed `saleMode` (API-02) and the `ending_soon`
 * sort (API-07), both of which the backend has now shipped and we verified.
 * An empty result is a genuine "no live auctions right now", not a capability
 * gap, so the rail shows a real empty state.
 */
export async function getEndingSoonAuctions(limit = 4) {
  const result = await getListings({
    saleMode: "auction",
    sort: "ending_soon",
    limit,
  });
  return result.items;
}

/** Newest live listings — "Just Listed". */
export async function getJustListed(limit = 5) {
  const result = await getListings({ sort: "created_at_desc", limit });
  return result.items;
}

/**
 * "Featured Listings".
 *
 * There is no `featured` flag or endpoint. `specialTags` exists on the model
 * but is not filterable. Newest-first is the honest approximation until the
 * backend exposes curation — flagged alongside API-06.
 */
export async function getFeaturedListings(limit = 4) {
  const result = await getListings({ sort: "created_at_desc", limit });
  return result.items;
}


/**
 * The steepest genuine discount, for the AI-search compare card.
 *
 * Sorting by `discount_desc` is safe — the `total` mismatch in BUG-01 affects
 * `minDiscountPercent` (a filter), not sorting. Returns null unless the listing
 * really does carry an `originalPrice` above its price, so the card only ever
 * shows a real saving.
 */
export async function getBestDeal() {
  const result = await getListings({ sort: "discount_desc", limit: 1 });
  const listing = result.items[0];
  if (!listing?.originalPrice || !listing.price) return null;
  return Number(listing.originalPrice) > Number(listing.price) ? listing : null;
}

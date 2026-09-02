import { apiFetch } from "../client";
import { viewerApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import { listingDetailSchema, paginatedListingsSchema } from "../schemas/listing";
import { listingFacetsSchema } from "../schemas/catalog";

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
  /** Fixed by BUG-01 — `total` now reflects the filter. Whole percent, 0–100. */
  minDiscountPercent?: number;
  /** Comma-separated. Multiple tags are AND — an item must carry every one. */
  specialTags?: string;
  /**
   * Resolves to the material and matches either `attributes.materialId` or the
   * material's name/slug in `attributes.material` (GAP-35) — so it works on
   * rows the backfill hasn't reached.
   */
  materialId?: string;
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
 * Viewer-aware since GAP-100: the route is still public and returns the same
 * rows either way, but a request with a session gets `isLiked` on each row and
 * is therefore uncached. Anonymous traffic — every crawler, every first visit —
 * keeps the shared 60-second entry.
 *
 * `saleMode`, price range, city/country and the wider sort set are verified
 * working, and BUG-01 / BUG-02 are fixed: `specialTags` and `minDiscountPercent`
 * now filter `total` as well as `items`, and `materialId` 400s on a malformed
 * value instead of 500ing on every value (re-verified 2026-08-23).
 *
 * `discount_desc` is fixed (GAP-33): it orders by the real saving,
 * `(originalPrice − price) / originalPrice`, across the whole filtered
 * catalogue rather than one page, and undiscounted rows rank last instead of
 * being dropped — so `total` still matches what the pages contain.
 *
 * Don't add query params speculatively — unknown ones are ignored server-side,
 * which reads as a filter that silently does nothing.
 */
export async function getListings(query: ListingQuery = {}) {
  const data = await viewerApiFetch<unknown>("/listings", {
    params: { status: "live", ...query },
    next: { revalidate: 60, tags: ["listings"] },
  });
  return parseResponse(paginatedListingsSchema, data, "GET /listings");
}

/**
 * A single listing for the product page.
 *
 * Returns `ListingDetail` — the same columns as a card plus the `seller`,
 * `brand`, `category` and `defects` joins, which exist on this endpoint only.
 *
 * This used to fall back to scanning `GET /listings`, because `GET /listings/{id}`
 * returned 500 for every real id (API-24). That was a missing `brands.is_official`
 * column: the query 404s cleanly on an unknown id — before the broken join runs —
 * and only throws once a parent row is found. The migration fixed it; verified
 * 200 on 2026-08-23. The scan is gone, and with it the two limits it carried —
 * listings outside the first three pages 404ing, and cards standing in for
 * details with no seller or brand attached.
 */
/**
 * Option counts for the sidebar, taking the same filters as the grid (GAP-31).
 *
 * Non-fatal by design: the panel renders without counts if this fails, so a
 * facet outage degrades the sidebar rather than the page.
 */
export async function getListingFacets(query: ListingQuery = {}) {
  const data = await apiFetch<unknown>("/listings/facets", {
    params: { status: "live", ...query },
    next: { revalidate: 120, tags: ["listings"] },
  });
  return parseResponse(listingFacetsSchema, data, "GET /listings/facets");
}

export async function getListing(id: string) {
  try {
    const data = await viewerApiFetch<unknown>(`/listings/${id}`, {
      next: { revalidate: 60, tags: ["listings", `listing:${id}`] },
    });
    return parseResponse(listingDetailSchema, data, `GET /listings/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
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
 * `specialTags` became filterable in the round-2 fixes, but there is still no
 * `featured` tag — live data carries only `luxury`, `authentic` and
 * `limited_edition`, none of which means "editorially picked". Newest-first
 * stays the honest approximation until the backend exposes curation (API-06);
 * the alternative is dressing up a tag as a promise the API isn't making.
 */
export async function getFeaturedListings(limit = 4) {
  const result = await getListings({ sort: "created_at_desc", limit });
  return result.items;
}


/**
 * The steepest genuine discount, for the AI-search compare card.
 *
 * One row, ranked server-side. `discount_desc` used to sort by price ascending,
 * so this ranked a page of results locally; GAP-33 made it order by the real
 * saving across the whole filtered catalogue, which is both correct past the
 * first page and one request instead of a hundred rows.
 */
export async function getBestDeal() {
  const result = await getListings({ sort: "discount_desc", limit: 1 });
  return result.items[0] ?? null;
}

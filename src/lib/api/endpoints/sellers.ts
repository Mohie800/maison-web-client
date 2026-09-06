import { apiFetch } from "../client";
import { viewerApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  sellerConnectionsSchema,
  sellerItemsSchema,
  sellerProfileSchema,
  sellerReviewsSchema,
  SELLER_ITEMS_MAX_LIMIT,
  type SellerItemFilter,
  type SellerItemSort,
} from "../schemas/seller";

/**
 * Seller profile reads.
 *
 * All public since the backend's Round 2 drop (API-25) — verified anonymously.
 * Sending a token personalises `isSelf` / `isFollowing` on the profile; the
 * URLs don't change, so nothing here branches on whether a session exists.
 */

export async function getSeller(id: string) {
  try {
    const data = await apiFetch<unknown>(`/sellers/${id}`, {
      next: { revalidate: 120, tags: ["sellers", `seller:${id}`] },
    });
    return parseResponse(sellerProfileSchema, data, `GET /sellers/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export interface SellerItemsQuery {
  page?: number;
  limit?: number;
  filter?: SellerItemFilter;
  sort?: SellerItemSort;
  /** A parent category includes its direct children (GAP-37). */
  categoryId?: string;
}

/**
 * A seller's listings.
 *
 * `filter` accepts `all | available | on_sale | sold` and `sort` accepts
 * `newest | price_asc | price_desc` — anything else is a 400, so both are typed
 * rather than passed through as strings. `limit` is capped at 50.
 *
 * Since GAP-37 it also takes `categoryId` — passing a parent includes its
 * direct children, which matters because the rail is top-level while sellers
 * file on leaves — and the response carries a `categories` rail plus a
 * `category` on every item.
 *
 * Viewer-aware since GAP-100: with a session each item carries `isLiked`, so
 * the Items tab draws the viewer's own hearts.
 */
export async function getSellerItems(id: string, query: SellerItemsQuery = {}) {
  const data = await viewerApiFetch<unknown>(`/sellers/${id}/items`, {
    params: {
      ...query,
      limit: Math.min(query.limit ?? 24, SELLER_ITEMS_MAX_LIMIT),
    },
    next: { revalidate: 60, tags: ["sellers", `seller:${id}:items`] },
  });
  return parseResponse(sellerItemsSchema, data, `GET /sellers/${id}/items`);
}

/**
 * A seller's reviews, with a `summary` block the backend computes per request.
 *
 * That summary is the *only* trustworthy source for a seller's rating — the
 * profile's own `ratingAvg` / `ratingCount` are never incremented for seeded
 * sellers and read null/0 against real reviews (GAP-36).
 */
/**
 * `filter` accepts `all | with_photos | verified`, and since Round 9 the
 * endpoint also takes `startDate`/`endDate` — the `summary` block honours the
 * window too, so the average matches the rows (GAP-114).
 */
export async function getSellerReviews(
  id: string,
  query: {
    page?: number;
    limit?: number;
    filter?: "all" | "with_photos" | "verified";
    startDate?: string;
    endDate?: string;
  } = {},
) {
  const data = await apiFetch<unknown>(`/sellers/${id}/reviews`, {
    params: { ...query, limit: query.limit ?? 10 },
    next: { revalidate: 120, tags: ["sellers", `seller:${id}:reviews`] },
  });
  return parseResponse(sellerReviewsSchema, data, `GET /sellers/${id}/reviews`);
}

export async function getSellerFollowers(
  id: string,
  query: { page?: number; limit?: number } = {},
) {
  const data = await apiFetch<unknown>(`/sellers/${id}/followers`, {
    params: { ...query, limit: query.limit ?? 1 },
    next: { revalidate: 120, tags: ["sellers", `seller:${id}:followers`] },
  });
  return parseResponse(
    sellerConnectionsSchema,
    data,
    `GET /sellers/${id}/followers`,
  );
}

export async function getSellerFollowing(
  id: string,
  query: { page?: number; limit?: number } = {},
) {
  const data = await apiFetch<unknown>(`/sellers/${id}/following`, {
    params: { ...query, limit: query.limit ?? 1 },
    next: { revalidate: 120, tags: ["sellers", `seller:${id}:following`] },
  });
  return parseResponse(
    sellerConnectionsSchema,
    data,
    `GET /sellers/${id}/following`,
  );
}

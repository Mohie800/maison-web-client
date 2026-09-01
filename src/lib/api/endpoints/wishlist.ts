import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { apiFetch } from "../client";
import {
  sharedWishlistSchema,
  shareTokenSchema,
  wishlistSchema,
  WISHLIST_PAGE_SIZE,
  type WishlistTab,
} from "../schemas/wishlist";

/**
 * Saving and unsaving. There is no `POST /wishlist` — the add half of the
 * wishlist lives under the listing as a "like", and the two are the same act
 * (see schemas/wishlist.ts). Removal has both a `DELETE /wishlist/{id}` and
 * this; this one keeps the pair symmetric from a card.
 */
export async function likeListing(listingId: string): Promise<void> {
  await serverApiFetch(`/listings/${listingId}/like`, { method: "POST" });
}

export async function unlikeListing(listingId: string): Promise<void> {
  await serverApiFetch(`/listings/${listingId}/like`, { method: "DELETE" });
}

/**
 * The signed-in user's saved items.
 *
 * `tab` is server-filtered and the response carries a `counts` object with the
 * totals for every tab — the same shape `GET /orders` uses, so the header count
 * is a real total rather than a count of the current page.
 */
export async function getWishlist(tab: WishlistTab = "all", page = 1) {
  const data = await serverApiFetch<unknown>("/wishlist", {
    params: { tab, page, limit: WISHLIST_PAGE_SIZE },
  });
  return parseResponse(wishlistSchema, data, "GET /wishlist");
}

/**
 * Mints the owner's share token, or returns the one they already have — the
 * endpoint is idempotent, so a second press can't invalidate a link they have
 * already sent to someone (GAP-42).
 */
export async function shareWishlist() {
  const data = await serverApiFetch<unknown>("/wishlist/share", {
    method: "POST",
  });
  return parseResponse(shareTokenSchema, data, "POST /wishlist/share");
}

/** Revokes the token. The circulated URL 404s from then on. */
export async function unshareWishlist(): Promise<void> {
  await serverApiFetch("/wishlist/share", { method: "DELETE" });
}

/**
 * A published wishlist, by token. Public — no bearer, and deliberately
 * uncached so a revoked link stops working immediately.
 */
export async function getSharedWishlist(shareToken: string, page = 1) {
  const data = await apiFetch<unknown>(`/wishlist/shared/${shareToken}`, {
    params: { page, limit: WISHLIST_PAGE_SIZE },
    cache: "no-store",
  });
  return parseResponse(
    sharedWishlistSchema,
    data,
    "GET /wishlist/shared/{shareToken}",
  );
}

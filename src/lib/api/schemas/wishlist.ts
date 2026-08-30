import { z } from "zod";

/**
 * Wishlist shapes, derived from live responses — the spec documents no response
 * bodies (API-05).
 *
 * Note how an item *gets* here: there is no `POST /wishlist`. Saving is
 * `POST /listings/{id}/like`, which returns `{ liked, likeCount }` — liking and
 * wishlisting are the same act. Removal is `DELETE /wishlist/{listingId}`, so
 * the two halves live under different resources.
 */

const money = z.union([z.string(), z.number()]).nullish();

export const wishlistItemSchema = z.object({
  /** The row is keyed by the listing; there is no separate wishlist-entry id. */
  listingId: z.string(),
  savedAt: z.string().nullish(),
  title: z.string(),
  status: z.string().nullish(),
  /** Both added by GAP-41 — the design's "Like New · Fashion" line. */
  condition: z.string().nullish(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      nameEn: z.string().nullish(),
      slug: z.string().nullish(),
    })
    .nullish(),
  price: money,
  originalPrice: money,
  currency: z.string().nullish(),

  isOnSale: z.boolean().nullish(),
  isAvailable: z.boolean().nullish(),
  isSold: z.boolean().nullish(),

  /** Set when the price fell after the item was saved. */
  priceDropped: z.boolean().nullish(),
  priceDropAmount: z.number().nullish(),
  /** Toggled by `PATCH /wishlist/{listingId}/notify`. */
  notifyOnPriceDrop: z.boolean().nullish(),

  likeCount: z.number().nullish(),
  coverPhotoUrl: z.string().nullish(),
  seller: z
    .object({
      id: z.string(),
      handle: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

export type WishlistItem = z.infer<typeof wishlistItemSchema>;

/** Tabs the endpoint accepts; the `counts` object uses the same keys. */
export const WISHLIST_TABS = ["all", "on_sale", "available", "sold"] as const;
export type WishlistTab = (typeof WISHLIST_TABS)[number];

export const wishlistSchema = z.object({
  items: z.array(wishlistItemSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  /** Server-side totals per tab — real counts, not counts of the current page. */
  counts: z.record(z.string(), z.number()).nullish(),
  /**
   * Whether this list is published, and under which token. Both arrived with
   * GAP-81, so the Share panel reads its own state instead of inferring it
   * from the token we happened to put in the URL after minting.
   */
  shareToken: z.string().nullish(),
  isShared: z.boolean().nullish(),
});

export const WISHLIST_PAGE_SIZE = 12;

/**
 * A wishlist someone has published — `GET /wishlist/shared/{shareToken}`,
 * public (GAP-42).
 *
 * Same rows minus the three fields that only mean something to the owner:
 * `notifyOnPriceDrop` is their subscription, and `priceDropped` /
 * `priceDropAmount` are measured against the price *they* saved at. There are
 * no tabs and no `counts` — a shared page has no tab bar.
 */
export const sharedWishlistSchema = z.object({
  owner: z.object({
    id: z.string(),
    handle: z.string().nullish(),
    profilePic: z.string().nullish(),
  }),
  items: z.array(wishlistItemSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export type SharedWishlist = z.infer<typeof sharedWishlistSchema>;

export const shareTokenSchema = z.object({
  shareToken: z.string(),
  /** False when the owner already had a token — minting is idempotent. */
  created: z.boolean().nullish(),
});

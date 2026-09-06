import { z } from "zod";

/**
 * Seller profile shapes, derived from live responses — the spec documents no
 * response bodies (API-05).
 *
 * These endpoints became publicly readable in the backend's Round 2 drop
 * (API-25). Verified 2026-08-23: `/sellers/{id}`, `/items`, `/reviews`,
 * `/followers` and `/following` all return 200 with no `Authorization` header.
 * `isSelf` and `isFollowing` come back `false` anonymously and populate when a
 * token is sent — same URL either way.
 */

const money = z.union([z.string(), z.number()]).nullish();

/** Denormalised counters that ride along on the profile. See the caveat below. */
export const sellerStatsSchema = z.object({
  items: z.number().nullish(),
  /** Live only — `items` is everything the seller has ever listed. */
  itemsLive: z.number().nullish(),
  followers: z.number().nullish(),
  following: z.number().nullish(),
  rating: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  itemsSold: z.number().nullish(),
  responseRatePercent: z.number().nullish(),
  avgShipTimeHours: z.number().nullish(),
});

export const sellerProfileSchema = z.object({
  id: z.string(),
  fullName: z.string().nullish(),
  username: z.string().nullish(),
  profilePic: z.string().nullish(),
  bio: z.string().nullish(),
  aboutText: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  createdAt: z.string().nullish(),

  /** Writable since Round 9 (GAP-116). */
  tags: z.array(z.string()).nullish(),
  bannerUrl: z.string().nullish(),

  isPro: z.boolean().nullish(),
  isFastShipper: z.boolean().nullish(),
  isTopSeller: z.boolean().nullish(),
  /** A boolean here — the seller embedded on a listing calls it `verifiedAt`. */
  isVerified: z.boolean().nullish(),

  /** Both false anonymously; meaningful only with a token. */
  isSelf: z.boolean().nullish(),
  isFollowing: z.boolean().nullish(),

  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  followersCount: z.number().nullish(),
  followingCount: z.number().nullish(),
  itemsSoldCount: z.number().nullish(),
  responseRatePercent: z.number().nullish(),
  avgShipTimeHours: z.number().nullish(),

  // Policy / logistics — the About tab's content.
  shipsFromCity: z.string().nullish(),
  freeShippingThreshold: money,
  returnsAccepted: z.boolean().nullish(),
  returnWindowDays: z.number().nullish(),
  authenticityGuaranteed: z.boolean().nullish(),

  stats: sellerStatsSchema.nullish(),
});

export type SellerProfile = z.infer<typeof sellerProfileSchema>;

/**
 * ⚠️ **The profile's own counters are not maintained.**
 *
 * Measured across all 11 sellers in the catalogue on 2026-08-25: every seller
 * that actually has followers or reviews reports `followersCount: 0`,
 * `ratingCount: 0` and `ratingAvg: null`, while `/followers` returns 4–6 and
 * `/reviews` returns a computed `summary.average` of 4.5–5. The counters read
 * correctly only for sellers who have none of either — i.e. they are never
 * incremented for seeded rows.
 *
 * So the banner sources its numbers from the collections, which are computed
 * per request and correct. Raised with the backend as GAP-36; when the counters
 * are fixed this can collapse back to reading the profile.
 */

/**
 * The item DTO on `GET /sellers/{id}/items` — slimmer than a listing and
 * slimmer than a `/trends` card: no `saleMode`, no auction block, and `photos`
 * is `[{ url }]` with no cover flag. `categoryId` and the joined `category`
 * arrived with GAP-37, which is what made the category sidebar buildable.
 */
export const sellerItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  condition: z.string().nullish(),
  status: z.string().nullish(),
  price: money,
  originalPrice: money,
  currency: z.string().nullish(),
  likeCount: z.number().nullish(),
  /** The viewer's own like (GAP-100). Absent without a token, as on listings. */
  isLiked: z.boolean().nullish(),
  specialTags: z.array(z.string()).nullish(),
  photos: z.array(z.object({ url: z.string() })).nullish(),
  categoryId: z.string().nullish(),
  category: z.object({ id: z.string(), name: z.string() }).nullish(),
});

export type SellerItem = z.infer<typeof sellerItemSchema>;

/**
 * One row of the profile's category rail (GAP-37).
 *
 * Built from the seller's whole public inventory rather than the current page,
 * so selecting one category doesn't make the others vanish.
 *
 * Both levels come back: a leaf carries `parent`, its parent appears as its own
 * row, and the same listing is counted in each. The sidebar renders the
 * top-level rows only — otherwise one item shows as "Kids (1)" and "Boys (1)".
 * `isTopLevel` says which is which since GAP-51, so that no longer rests on
 * `parent` being absent.
 */
export const sellerCategoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  slug: z.string().nullish(),
  count: z.number().nullish(),
  /** GAP-51 — 1 for a root, 2 for a leaf. */
  isTopLevel: z.boolean().nullish(),
  level: z.number().nullish(),
  parentId: z.string().nullish(),
  parent: z
    .object({
      id: z.string(),
      name: z.string().nullish(),
      nameEn: z.string().nullish(),
      slug: z.string().nullish(),
    })
    .nullish(),
});

export type SellerCategoryRow = z.infer<typeof sellerCategoryRowSchema>;

export const sellerItemsSchema = z.object({
  items: z.array(sellerItemSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  filter: z.string().nullish(),
  sort: z.string().nullish(),
  categoryId: z.string().nullish(),
  categories: z.array(sellerCategoryRowSchema).nullish(),
});

export const sellerReviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  comment: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  photos: z.array(z.string()).nullish(),
  helpfulCount: z.number().nullish(),
  sellerReply: z.string().nullish(),
  sellerRepliedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  verifiedBuyer: z.boolean().nullish(),
  /** Title of the listing this review is about. */
  purchasedTitle: z.string().nullish(),
  buyer: z
    .object({
      id: z.string(),
      fullName: z.string().nullish(),
      username: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

export type SellerReview = z.infer<typeof sellerReviewSchema>;

export const sellerReviewsSchema = z.object({
  /** Computed per request — trustworthy, unlike the profile's rating fields. */
  summary: z
    .object({
      average: z.number().nullish(),
      total: z.number().nullish(),
      distribution: z.record(z.string(), z.number()).nullish(),
    })
    .nullish(),
  items: z.array(sellerReviewSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export const sellerConnectionSchema = z.object({
  id: z.string(),
  fullName: z.string().nullish(),
  username: z.string().nullish(),
  profilePic: z.string().nullish(),
});

export const sellerConnectionsSchema = z.object({
  items: z.array(sellerConnectionSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

/** `filter` and `sort` values the items endpoint accepts; anything else 400s. */
export const SELLER_ITEM_FILTERS = ["all", "available", "on_sale", "sold"] as const;
export const SELLER_ITEM_SORTS = ["newest", "price_asc", "price_desc"] as const;

export type SellerItemFilter = (typeof SELLER_ITEM_FILTERS)[number];
export type SellerItemSort = (typeof SELLER_ITEM_SORTS)[number];

/** The endpoint caps `limit` at 50 and 400s above it. */
export const SELLER_ITEMS_MAX_LIMIT = 50;

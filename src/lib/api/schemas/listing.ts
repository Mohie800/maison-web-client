import { z } from "zod";

/**
 * Derived from live responses — the spec documents no response bodies.
 * Kept loose (`.nullish()`, passthrough-friendly) because listing payloads vary
 * by sale mode: auction fields are null on fixed-price items and vice versa.
 */

export const listingPhotoSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  url: z.string(),
  sortOrder: z.number(),
  isCover: z.boolean(),
});

export const CONDITIONS = [
  "new",
  "new_with_tags",
  "new_without_tags",
  "like_new",
  "good",
  "fair",
] as const;

export const SALE_MODES = ["fixed", "negotiable", "auction", "trade"] as const;

export type Condition = (typeof CONDITIONS)[number];
export type SaleMode = (typeof SALE_MODES)[number];

export const listingSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  categoryId: z.string().nullish(),
  brandId: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  condition: z.string().nullish(),
  attributes: z.record(z.string(), z.unknown()).nullish(),
  status: z.string(),
  saleMode: z.string(),

  // Money — decimal strings. Never parsed into numbers for arithmetic.
  originalPrice: z.string().nullish(),
  price: z.string().nullish(),
  currency: z.string().nullish(),
  platformFeeAmount: z.string().nullish(),
  sellerEarnings: z.string().nullish(),

  quantity: z.number().nullish(),
  isNegotiable: z.boolean().nullish(),

  // Auction
  auctionEnabled: z.boolean().nullish(),
  startingBid: z.string().nullish(),
  reservePrice: z.string().nullish(),
  auctionEndsAt: z.string().nullish(),
  currentBid: z.string().nullish(),
  bidCount: z.number().nullish(),
  entryFeeAmount: z.string().nullish(),
  auctionDurationHours: z.number().nullish(),
  minBidIncrementPercent: z.number().nullish(),
  minBidIncrementAbsolute: z.union([z.string(), z.number()]).nullish(),
  antiSnipeWindowSeconds: z.number().nullish(),
  antiSnipeExtensionSeconds: z.number().nullish(),
  buyerPremiumPercent: z.number().nullish(),
  paymentWindowHours: z.number().nullish(),
  winningBidderId: z.string().nullish(),

  specialTags: z.array(z.string()).nullish(),
  finalSale: z.boolean().nullish(),
  likeCount: z.number().nullish(),
  /**
   * The viewer's own row in `listing_likes` (GAP-100). Absent — not `false` —
   * when the request carries no token, so `null` means "nobody asked".
   */
  isLiked: z.boolean().nullish(),
  /**
   * What a trade seller will swap for (GAP-97). Always an array; `[]` is
   * "open to anything". The detail endpoint adds the names below.
   */
  tradePreferredCategoryIds: z.array(z.string()).nullish(),
  viewCount: z.number().nullish(),
  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  authenticityScore: z.number().nullish(),

  city: z.string().nullish(),
  country: z.string().nullish(),
  publishedAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  createdAt: z.string().nullish(),

  photos: z.array(listingPhotoSchema).nullish(),

  /**
   * Joined on the list endpoint since GAP-34 — the same three objects `/trends`
   * returns, alongside the raw ids. `GET /listings/{id}` overrides `seller`,
   * `brand` and `category` below with its fuller records.
   */
  seller: z
    .object({
      id: z.string(),
      handle: z.string().nullish(),
      profilePic: z.string().nullish(),
      isVerified: z.boolean().nullish(),
      isTopSeller: z.boolean().nullish(),
    })
    .nullish(),
  brand: z.object({ id: z.string(), name: z.string() }).nullish(),
  category: z.object({ id: z.string(), name: z.string() }).nullish(),
});

export type Listing = z.infer<typeof listingSchema>;

/**
 * The fuller relations `GET /listings/{id}` embeds.
 *
 * The list endpoint now joins the same three (GAP-34), but thinner: a seller
 * handle, a brand name, a category name. The detail endpoint returns whole
 * records — bio, follower counts, brand logo — plus `defects`, which is why the
 * split survives. (Re-verified 2026-08-28.)
 */

export const listingSellerSchema = z.object({
  id: z.string(),
  fullName: z.string().nullish(),
  /** The handle is `username` here — `GET /sellers/{id}` calls it the same. */
  username: z.string().nullish(),
  profilePic: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  bio: z.string().nullish(),
  isPro: z.boolean().nullish(),
  /** `verifiedAt` carries when; `isVerified` answers whether. Both are sent. */
  verifiedAt: z.string().nullish(),
  isVerified: z.boolean().nullish(),
  isFastShipper: z.boolean().nullish(),
  isTopSeller: z.boolean().nullish(),
  followersCount: z.number().nullish(),
  followingCount: z.number().nullish(),
  itemsSoldCount: z.number().nullish(),
  responseRatePercent: z.number().nullish(),
  avgShipTimeHours: z.number().nullish(),
  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  lastActiveAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export type ListingSeller = z.infer<typeof listingSellerSchema>;

export const listingBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  slug: z.string().nullish(),
  logoUrl: z.string().nullish(),
  isOfficial: z.boolean().nullish(),
  verifiedAt: z.string().nullish(),
});

export const listingCategorySchema = z.object({
  id: z.string(),
  parentId: z.string().nullish(),
  slug: z.string().nullish(),
  name: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  iconUrl: z.string().nullish(),
});

/**
 * The trade preferences resolved to names, detail endpoint only. Carries no
 * `nameAr`, unlike every other category object the API returns — so an Arabic
 * chip label comes from the category tree, not from here.
 */
export const tradePreferredCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().nullish(),
  slug: z.string().nullish(),
});

export type TradePreferredCategory = z.infer<
  typeof tradePreferredCategorySchema
>;

export const listingDetailSchema = listingSchema.extend({
  seller: listingSellerSchema.nullish(),
  brand: listingBrandSchema.nullish(),
  category: listingCategorySchema.nullish(),
  /** The seller's order, not the database's; a deleted category drops out. */
  tradePreferredCategories: z.array(tradePreferredCategorySchema).nullish(),
  /** Always `[]` on current data; shape unconfirmed, so it stays opaque. */
  defects: z.array(z.unknown()).nullish(),
});

export type ListingDetail = z.infer<typeof listingDetailSchema>;

/** `isVerified` is the documented field; `verifiedAt` is the older spelling. */
export function isVerifiedSeller(seller: {
  isVerified?: boolean | null;
  verifiedAt?: string | null;
}): boolean {
  return seller.isVerified ?? Boolean(seller.verifiedAt);
}

export const paginatedListingsSchema = z.object({
  items: z.array(listingSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/** Cover photo, falling back to the first available. */
export function coverPhotoUrl(listing: Listing): string | null {
  const photos = listing.photos ?? [];
  const cover = photos.find((p) => p.isCover) ?? photos[0];
  return cover?.url ?? null;
}

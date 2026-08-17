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

  specialTags: z.array(z.string()).nullish(),
  finalSale: z.boolean().nullish(),
  likeCount: z.number().nullish(),
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
});

export type Listing = z.infer<typeof listingSchema>;

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

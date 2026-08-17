import { z } from "zod";

/**
 * `GET /trends` returns a purpose-built product-card DTO — flatter and richer
 * than the raw listing from `GET /listings`, with the seller, brand, category
 * and cover photo already joined. Where a rail can be fed from it, prefer it.
 *
 * Note the money inconsistency: `/trends` returns `price` as a **number**
 * (500) while `/listings` returns it as a **string** ("500"). Both are accepted
 * here and normalised to a string, since everything downstream treats money as
 * text. Raised with the backend as part of API-05.
 */
const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? null : String(v)));

export const cardSellerSchema = z.object({
  id: z.string(),
  handle: z.string().nullish(),
  profilePic: z.string().nullish(),
  isVerified: z.boolean().nullish(),
  isTopSeller: z.boolean().nullish(),
});

export const productCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: money,
  originalPrice: money,
  discountPercent: z.number().nullish(),
  currency: z.string().nullish(),
  coverPhotoUrl: z.string().nullish(),
  photoUrls: z.array(z.string()).nullish(),
  saleMode: z.string().nullish(),
  condition: z.string().nullish(),
  /** e.g. "add_to_bag" | "request_trade" | "place_bid" — drives the card CTA. */
  cta: z.string().nullish(),
  /** Structured, not a string: { type: "auction", label: "AUCTION" }. */
  badge: z
    .object({ type: z.string(), label: z.string() })
    .nullish(),
  likeCount: z.number().nullish(),
  isLiked: z.boolean().nullish(),
  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  viewCount: z.number().nullish(),
  seller: cardSellerSchema.nullish(),
  brand: z.object({ id: z.string(), name: z.string() }).nullish(),
  category: z.object({ id: z.string(), name: z.string() }).nullish(),
  auction: z
    .object({
      currentBid: money,
      startingBid: money,
      bidCount: z.number().nullish(),
      endsAt: z.string().nullish(),
    })
    .nullish(),
  publishedAt: z.string().nullish(),
});

export type ProductCard = z.infer<typeof productCardSchema>;

/** True when the card should be presented as an auction rather than a sale. */
export function isAuctionCard(card: ProductCard): boolean {
  return card.saleMode === "auction" || Boolean(card.auction);
}

/**
 * The amount to display for a card.
 *
 * Auction listings have a null `price` — their value is the current bid (or the
 * starting bid before anyone has bid). Reading `price` alone renders blank.
 */
export function cardAmount(card: ProductCard): string | null {
  if (isAuctionCard(card)) {
    return card.auction?.currentBid ?? card.auction?.startingBid ?? null;
  }
  return card.price;
}

export const paginatedCardsSchema = z.object({
  items: z.array(productCardSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

/** `GET /trends/top-stores` — sellers ranked by units sold this week. */
export const topStoreSchema = z.object({
  id: z.string().nullish(),
  userId: z.string().nullish(),
  handle: z.string().nullish(),
  name: z.string().nullish(),
  fullName: z.string().nullish(),
  profilePic: z.string().nullish(),
  isVerified: z.boolean().nullish(),
  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
  unitsSold: z.number().nullish(),
});

export const topStoresSchema = z.object({
  items: z.array(topStoreSchema),
  total: z.number().nullish(),
  weekStart: z.string().nullish(),
  rankingsUpdateAt: z.string().nullish(),
});

export type TopStore = z.infer<typeof topStoreSchema>;

export const storySchema = z.object({
  id: z.string(),
  userId: z.string(),
  mediaUrl: z.string(),
  caption: z.string().nullish(),
  listingId: z.string().nullish(),
  createdAt: z.string().nullish(),
  authorPhotoUrl: z.string().nullish(),
  user: z
    .object({
      id: z.string(),
      fullName: z.string().nullish(),
      username: z.string().nullish(),
      profilePic: z.string().nullish(),
      verifiedAt: z.string().nullish(),
    })
    .nullish(),
});

export type Story = z.infer<typeof storySchema>;

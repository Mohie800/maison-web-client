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

/**
 * `GET /trends/top-stores` — sellers ranked by sales this week.
 *
 * The seller is **nested**, not flat. This was written flat and every field was
 * `.nullish()`, so when the shape changed zod kept parsing and the rail silently
 * rendered blank names and `/sellers/undefined` links (found 2026-08-28). Hence
 * `seller` is required here: if this moves again we want a loud parse failure,
 * not six dead cards.
 */
export const topStoreSchema = z.object({
  rank: z.number().nullish(),
  salesCount: z.number().nullish(),
  revenue: z.number().nullish(),
  currency: z.string().nullish(),
  growthPercent: z.number().nullish(),
  followersCount: z.number().nullish(),
  categoryType: z.string().nullish(),
  seller: z.object({
    id: z.string(),
    fullName: z.string().nullish(),
    username: z.string().nullish(),
    profilePic: z.string().nullish(),
    isVerified: z.boolean().nullish(),
    isPro: z.boolean().nullish(),
    ratingAvg: z.union([z.string(), z.number()]).nullish(),
    ratingCount: z.number().nullish(),
  }),
  previewListings: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().nullish(),
        price: z.union([z.string(), z.number()]).nullish(),
        currency: z.string().nullish(),
        coverPhotoUrl: z.string().nullish(),
      }),
    )
    .nullish(),
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
  /** Per-viewer, and only sent to an authenticated caller. */
  seen: z.boolean().nullish(),
  /** The story's product card. Null on every story in the current data. */
  listing: z
    .object({
      id: z.string(),
      title: z.string().nullish(),
      price: z.union([z.string(), z.number()]).nullish(),
      originalPrice: z.union([z.string(), z.number()]).nullish(),
      currency: z.string().nullish(),
      condition: z.string().nullish(),
      coverPhotoUrl: z.string().nullish(),
      category: z.object({ id: z.string(), name: z.string() }).nullish(),
    })
    .nullish(),
  listingPhotoUrl: z.string().nullish(),
  expiresAt: z.string().nullish(),
  /** `everyone` on every story written before the column existed (GAP-90). */
  visibility: z.string().nullish(),
});

export type Story = z.infer<typeof storySchema>;

/**
 * `POST /stories` — the composer's two Round 6 fields.
 *
 * `durationHours` is a segmented picker of three values, not a timestamp; omit
 * it and the story lives 30 days, which no frame draws, so the composer always
 * sends one. `visibility` is enforced on read, not merely recorded.
 */
export const STORY_DURATIONS = [12, 24, 48] as const;
export type StoryDuration = (typeof STORY_DURATIONS)[number];

export const STORY_VISIBILITIES = ["everyone", "followers"] as const;
export type StoryVisibility = (typeof STORY_VISIBILITIES)[number];

export const STORY_CAPTION_MAX = 200;

/**
 * `GET /stories?groupBy=user` — one row per author, which is the unit the
 * stories bar and `GET /stories/{userId}` both work in (GAP-30).
 *
 * The server sorts these the way a stories bar sorts: authors with something
 * unseen first, then by recency. That rule lives there rather than being
 * reimplemented per client, so the order is taken as given.
 *
 * `hasUnseen` is true while *any* of that author's stories is unwatched, and is
 * per-viewer — so a response carrying it must never be shared between users.
 */
export const storyGroupSchema = z.object({
  userId: z.string(),
  user: storySchema.shape.user,
  authorPhotoUrl: z.string().nullish(),
  storyCount: z.number().nullish(),
  hasUnseen: z.boolean().nullish(),
  isSelf: z.boolean().nullish(),
  lastStoryAt: z.string().nullish(),
  latestStory: storySchema.nullish(),
  storyIds: z.array(z.string()).nullish(),
});

export type StoryGroup = z.infer<typeof storyGroupSchema>;

/**
 * `GET /search/trending` — the Trend Hub's "Trending Categories" (`651:1889`).
 *
 * Measured from a `search_events` table since GAP-54, over the same seven-day
 * windows the seller leaderboard uses. Two flags decide what a chip may say:
 *
 * - `source` is `measured` or `seed`. A `seed` row is the curated starter list
 *   with `searchCount: 0` — never put a number on it.
 * - `growthPercent` is null when the term has no previous-window baseline. Fall
 *   back to `formattedCount`; it is never a fabricated `+100%`.
 */
export const trendingSearchSchema = z.object({
  term: z.string(),
  searchCount: z.number().nullish(),
  formattedCount: z.string().nullish(),
  growthPercent: z.number().nullish(),
  formattedGrowth: z.string().nullish(),
  source: z.enum(["measured", "seed"]).nullish(),
  /**
   * The cover photo of the most-viewed live listing the term matches, resolved
   * with the same rule searching it runs (GAP-93). Null when the term matches
   * nothing with a photo — there is no stand-in.
   */
  imageUrl: z.string().nullish(),
});

export type TrendingSearch = z.infer<typeof trendingSearchSchema>;

export const trendingSearchesSchema = z.object({
  trendingSearches: z.array(trendingSearchSchema),
  /** The windows the growth figure compares, so a chip can label itself. */
  window: z
    .object({
      currentStart: z.string().nullish(),
      previousStart: z.string().nullish(),
      days: z.number().nullish(),
    })
    .nullish(),
});

import { z } from "zod";

/**
 * `GET /listings/me` — the seller's own listings.
 *
 * A fourth representation of a listing, distinct again from the card, the
 * detail and the seller-profile item. It carries the seller-facing numbers
 * (`viewCount`, `likeCount`, `soldCount`) and the draft wizard's progress
 * (`currentStep` / `totalSteps`), and drops everything buyer-facing.
 */
const money = z.union([z.string(), z.number()]).nullish();

export const myListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  condition: z.string().nullish(),
  saleMode: z.string().nullish(),
  price: money,
  originalPrice: money,
  currency: z.string().nullish(),
  quantity: z.number().nullish(),

  viewCount: z.number().nullish(),
  likeCount: z.number().nullish(),
  soldCount: z.number().nullish(),

  bidCount: z.number().nullish(),
  currentBid: money,
  auctionEnabled: z.boolean().nullish(),
  auctionEndsAt: z.string().nullish(),

  /** Set when a submitted listing was rejected in review. */
  rejectionReason: z.string().nullish(),
  /** Draft progress through the sell wizard — 1 of 7 on a fresh draft. */
  currentStep: z.number().nullish(),
  totalSteps: z.number().nullish(),

  /** When a live listing stops being live. Null on a draft (GAP-43). */
  expiresAt: z.string().nullish(),

  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  coverPhotoUrl: z.string().nullish(),
});

export type MyListing = z.infer<typeof myListingSchema>;

/**
 * Filters the endpoint accepts. The `counts` object uses the same keys and sums
 * to `all` — every `ListingStatus` belongs to exactly one of them (GAP-44).
 *
 * These are not the design's four tabs (All / Active / Sold / Expired): the API
 * also has `pending`, `draft`, `withdrawn` and `rejected`. We show all of them,
 * since inventory a seller owns is worth more to them than a tidier tab bar.
 */
export const MY_LISTING_FILTERS = [
  "all",
  "live",
  "pending",
  "sold_out",
  "draft",
  "expired",
  "withdrawn",
  "rejected",
] as const;
export type MyListingFilter = (typeof MY_LISTING_FILTERS)[number];

export const MY_LISTING_SORTS = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "views_desc",
] as const;
export type MyListingSort = (typeof MY_LISTING_SORTS)[number];

/**
 * The stat cards' numbers (GAP-43). Deliberately beside `counts` rather than in
 * it: `counts` is one entry per tab and has to sum to `all`, and a time-windowed
 * figure is not a tab.
 */
export const myListingStatsSchema = z.object({
  /** Units sold in the current calendar month, from `monthStart`. */
  soldThisMonth: z.number().nullish(),
  expiringSoon: z.number().nullish(),
  /** What "soon" means here, so the card can label itself. */
  expiringSoonWithinDays: z.number().nullish(),
  monthStart: z.string().nullish(),
});

export type MyListingStats = z.infer<typeof myListingStatsSchema>;

export const myListingsSchema = z.object({
  items: z.array(myListingSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  filter: z.string().nullish(),
  sort: z.string().nullish(),
  counts: z.record(z.string(), z.number()).nullish(),
  stats: myListingStatsSchema.nullish(),
});

export const MY_LISTINGS_PAGE_SIZE = 20;

/** Drafts are the only status the API lets a seller delete. */
export function isDeletable(listing: MyListing): boolean {
  return listing.status === "draft";
}

import { z } from "zod";

/**
 * Auction bidding — `GET /listings/{id}/auction-status`, `POST .../bids`,
 * `POST .../auction-entry`, `GET /me/bids`.
 *
 * Money arrives as numbers here, unlike listings, where it is decimal strings.
 * Kept as returned rather than normalised: a bid amount is posted back to the
 * API unchanged, so a round-trip through a string would only add a conversion.
 */

const money = z.union([z.string(), z.number()]).nullish();

/** One step on the quick-bid row — 651:4761. */
export const quickBidStepSchema = z.object({
  percent: z.number(),
  amount: z.number(),
});

export const auctionBidSchema = z.object({
  id: z.string().nullish(),
  amount: money,
  createdAt: z.string().nullish(),
  bidder: z
    .object({
      id: z.string().nullish(),
      fullName: z.string().nullish(),
      username: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

export const auctionStatusSchema = z.object({
  listingId: z.string(),
  status: z.string(),
  currentBid: money,
  startingBid: money,
  bidCount: z.number().nullish(),
  winningBidderId: z.string().nullish(),
  /** Moves when anti-snipe extends the auction — never cache this. */
  auctionEndsAt: z.string().nullish(),
  minNextBid: z.number().nullish(),
  quickBidSteps: z.array(quickBidStepSchema).nullish(),
  antiSnipeWindowSeconds: z.number().nullish(),
  antiSnipeExtensionSeconds: z.number().nullish(),
  recentBids: z.array(auctionBidSchema).nullish(),
  viewer: z
    .object({
      isLeading: z.boolean().nullish(),
      isOutbid: z.boolean().nullish(),
      outbidBy: money,
    })
    .nullish(),
});

export type AuctionStatus = z.infer<typeof auctionStatusSchema>;

/**
 * `POST /listings/{id}/auction-entry`. There is no GET — nothing can read back
 * whether a viewer has accepted the terms (GAP-67).
 */
export const auctionEntrySchema = z.object({
  id: z.string(),
  listingId: z.string(),
  entryFeeAmount: money,
  status: z.string(),
  termsAcceptedAt: z.string().nullish(),
  refundedAt: z.string().nullish(),
  forfeitedAt: z.string().nullish(),
});

export type AuctionEntry = z.infer<typeof auctionEntrySchema>;

/** The three tabs on Web_MyBids — the API's own `counts` keys. */
export const MY_BID_STATUSES = ["active", "won", "lost"] as const;
export type MyBidStatus = (typeof MY_BID_STATUSES)[number];

export const myBidSchema = z.object({
  listingId: z.string(),
  title: z.string().nullish(),
  coverPhotoUrl: z.string().nullish(),
  seller: z
    .object({
      id: z.string().nullish(),
      fullName: z.string().nullish(),
      username: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
  currentBid: money,
  userHighestBid: money,
  isLeading: z.boolean().nullish(),
  status: z.string().nullish(),
  auctionEndsAt: z.string().nullish(),
  listingStatus: z.string().nullish(),
  currency: z.string().nullish(),
});

export type MyBid = z.infer<typeof myBidSchema>;

export const myBidsSchema = z.object({
  items: z.array(myBidSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  counts: z
    .object({
      all: z.number().nullish(),
      active: z.number().nullish(),
      won: z.number().nullish(),
      lost: z.number().nullish(),
    })
    .nullish(),
});

/**
 * `GET /listings/{id}/auction-payment` — 404s with a message when nothing is
 * due, which is how a non-winner and a live auction both read.
 *
 * ⚠️ Every field here is inferred. No auction on dev has settled, and the
 * OpenAPI document at `/docs-json` describes request bodies but not responses,
 * so this shape is unverified (GAP-68). Each row on the payment screen renders
 * only when its field is actually present, so a wrong guess shows less rather
 * than a fabricated SAR 0.
 */
export const auctionPaymentSchema = z.object({
  listingId: z.string().nullish(),
  winningBid: money,
  buyerPremiumPercent: z.number().nullish(),
  buyerPremiumAmount: money,
  shippingAmount: money,
  vatAmount: money,
  totalAmount: money,
  dueAt: z.string().nullish(),
  status: z.string().nullish(),
  currency: z.string().nullish(),
});

export type AuctionPayment = z.infer<typeof auctionPaymentSchema>;

/** Number from either representation, for display and comparison only. */
export function amountOf(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * The API derives each step as `max(currentBid × (1 + percent), minNextBid)`,
 * so on a fresh auction the 5% and 10% steps are the same number. Two buttons
 * that place an identical bid are a bug on screen, not in the data.
 */
export function distinctSteps(
  steps: { percent: number; amount: number }[] | null | undefined,
): { percent: number; amount: number }[] {
  const seen = new Set<number>();
  return (steps ?? []).filter((step) =>
    seen.has(step.amount) ? false : (seen.add(step.amount), true),
  );
}

/**
 * `GET /auctions/stats` — the hero band's counters (GAP-55). Public.
 *
 * Both windows are on the response so a chip can label itself: `since` is
 * midnight UTC for the "today" figures, `endingSoonWithinHours` is what "soon"
 * means. `activeBidders` counts distinct people on currently live auctions, not
 * bids — someone raising themselves five times is one bidder.
 */
export const auctionStatsSchema = z.object({
  liveCount: z.number(),
  endingSoonCount: z.number().nullish(),
  activeBidders: z.number().nullish(),
  bidsToday: z.number().nullish(),
  bidVolumeToday: z.number().nullish(),
  currency: z.string().nullish(),
  since: z.string().nullish(),
  endingSoonWithinHours: z.number().nullish(),
});

export type AuctionStats = z.infer<typeof auctionStatsSchema>;

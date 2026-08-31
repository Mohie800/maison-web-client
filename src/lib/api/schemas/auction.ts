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
  /**
   * Who bid, by id alone — a bid carries no joined bidder. That is the right
   * call for an auction and it is what the frame draws: everyone but the viewer
   * is an anonymous "Bidder NN" (`651:4918`).
   */
  bidderId: z.string().nullish(),
  isAutoBid: z.boolean().nullish(),
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
  /**
   * Null until this viewer has accepted the auction's terms. Arrived with
   * GAP-67, which is what lets the panel send a first-time bidder to the terms
   * page on the click rather than on the 403 that follows their first bid.
   */
  auctionEntry: z
    .object({
      termsAcceptedAt: z.string().nullish(),
      status: z.string().nullish(),
      entryFeeAmount: money,
    })
    .nullish(),
});

export type AuctionStatus = z.infer<typeof auctionStatusSchema>;

/**
 * `POST /listings/{id}/auction-entry`. There is still no GET on this path, but
 * `auction-status` reads the state back on its `auctionEntry` block (GAP-67).
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
 * `AuctionPaymentResponseDto`, published with the Round 5 reply — this is no
 * longer a guess. Three things it corrected:
 *
 * - **The money comes twice.** `winningBid`, `buyerPremiumAmount` and `total`
 *   are numbers; `winningBidAmount`, `feesAmount` and `totalAmount` are the
 *   Prisma decimal columns behind them and arrive as strings. Use the named
 *   ones for arithmetic.
 * - **`shippingAmount` and `vatAmount` are always `null`** and always will be:
 *   shipping is arranged with the seller after the win and VAT applies at order
 *   checkout, not to a winning bid. They are returned rather than omitted so a
 *   card prints an em-dash instead of a fabricated SAR 0.
 * - **The buyer's premium is the only fee on this path.** It is also the
 *   `auctionFeeAmount` that checkout's preview returns as null (GAP-62).
 */
export const auctionPaymentSchema = z.object({
  id: z.string().nullish(),
  listingId: z.string().nullish(),
  winnerId: z.string().nullish(),
  currency: z.string().nullish(),
  /** Numbers. The `*Amount` twins below are the decimal strings. */
  winningBid: money,
  buyerPremiumAmount: money,
  buyerPremiumPercent: z.number().nullish(),
  total: money,
  winningBidAmount: money,
  feesAmount: money,
  totalAmount: money,
  /** Both documented as permanently null — see the note above. */
  shippingAmount: money.nullish(),
  vatAmount: money.nullish(),
  /** A high-value win is held for authentication before it ships. */
  requiresAuthenticationHold: z.boolean().nullish(),
  status: z.string().nullish(),
  dueAt: z.string().nullish(),
  paidAt: z.string().nullish(),
  /** Charged when the window passes unpaid. */
  penaltyAmount: money.nullish(),
  forfeitedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
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

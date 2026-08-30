import type { Listing } from "@/lib/api/schemas/listing";
import type { TradeRequest } from "@/lib/api/schemas/trade";
import { HISTORY_STATUSES, type TradeStatus } from "@/lib/api/schemas/trade";

/** Decimal strings on the wire; every arithmetic use goes through here. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface TradeSides {
  isRequester: boolean;
  /** Listing ids the viewer is giving up. */
  myListingIds: string[];
  /** Listing ids the viewer is receiving. */
  theirListingIds: string[];
  myValue: number;
  theirValue: number;
  /** The other party's user id, when the payload names them. */
  counterpartyId: string | null;
}

/**
 * Which side of the swap the viewer is on.
 *
 * A trade request names one target listing and one or more offered listings.
 * The requester gives the offered items and receives the target; the responder
 * — the target listing's owner — is the mirror of that.
 */
export function tradeSides(
  request: TradeRequest,
  viewerId: string | null,
): TradeSides {
  const isRequester = Boolean(viewerId) && request.requesterId === viewerId;
  const offered = (request.offerItems ?? []).map((item) => item.listingId);

  return {
    isRequester,
    myListingIds: isRequester ? offered : [request.listingId],
    theirListingIds: isRequester ? [request.listingId] : offered,
    myValue: toNumber(isRequester ? request.offeredValue : request.targetValue),
    theirValue: toNumber(
      isRequester ? request.targetValue : request.offeredValue,
    ),
    counterpartyId: isRequester ? null : request.requesterId,
  };
}

export interface TradeCash {
  /** Cash moving in the viewer's favour. Negative means the viewer pays. */
  difference: number;
  /** The viewer's share of the 1% commission — zero unless they are the payer. */
  commission: number;
  /** Half of `shippingTotal`; the frame labels it "Your shipping share (50%)". */
  shippingShare: number;
  /** `difference − commission − shippingShare`. Positive is received. */
  net: number;
  /** True when neither side owes cash on top of the swap. */
  isEven: boolean;
  /** The direction could not be read from the payload — see GAP-86. */
  directionUnknown: boolean;
}

/**
 * The Cash breakdown panel — `651:6356`.
 *
 * `counterAmount` replaces `autoDifference` once someone counters. Direction
 * comes from `payerId`; when a counter leaves it null the counter's own
 * semantics decide, since only the target listing's owner can counter and the
 * amount is what they are asking for (GAP-86).
 *
 * The net is summed from the three rows the frame prints rather than read from
 * `requesterTotal` / `responderTotal`. Those two are not symmetric: the payer's
 * total folds the cash difference in (140 + 5.20 + 15 = 160.20) while the
 * receiver's carries only their fees (15), so using them directly would count
 * the difference twice on one side and drop it on the other.
 */
export function tradeCash(
  request: TradeRequest,
  sides: TradeSides,
  viewerId: string | null,
): TradeCash {
  const countered =
    request.counterAmount !== null && request.counterAmount !== undefined;
  const amount = countered
    ? toNumber(request.counterAmount)
    : toNumber(request.autoDifference);

  const shippingShare = toNumber(request.shippingTotal) / 2;
  const commission =
    viewerId && request.commissionPayerId === viewerId
      ? toNumber(request.commissionAmount)
      : 0;

  if (amount === 0) {
    return {
      difference: 0,
      commission,
      shippingShare,
      net: -(commission + shippingShare),
      isEven: true,
      directionUnknown: false,
    };
  }

  const payerId = request.payerId ?? null;
  const directionUnknown = payerId === null && countered;

  // Known payer wins; otherwise a counter is the responder asking to be paid.
  const viewerPays = payerId
    ? Boolean(viewerId) && payerId === viewerId
    : sides.isRequester;

  const difference = viewerPays ? -amount : amount;

  return {
    difference,
    commission,
    shippingShare,
    net: difference - commission - shippingShare,
    isEven: false,
    directionUnknown,
  };
}

/**
 * Status chip tone. Three are drawn: Pending `651:6622`, In Hub `651:6657` and
 * Counter Offer `651:6689`. The settled states have no frame, so they follow
 * the same tint/text pairing.
 */
export const TRADE_BADGE_TONE: Record<string, string> = {
  pending: "bg-warn-tint text-amber-deep",
  countered: "bg-purple-tint text-purple-text",
  accepted: "bg-info-tint text-info",
  completed: "bg-success-tint text-success",
  declined: "bg-error-tint text-error",
  cancelled: "bg-fill-100 text-ink-500",
  expired: "bg-fill-100 text-ink-500",
};

export function isHistoryStatus(status: string): boolean {
  return HISTORY_STATUSES.includes(status as TradeStatus);
}

/** Only these two states accept accept / counter / decline. */
export function isDecidable(status: string): boolean {
  return status === "pending" || status === "countered";
}

/**
 * Where the trade sits on the six-step timeline of `651:6461`.
 *
 * Driven by the timestamps the payload carries rather than by the position of
 * `fulfillmentStatus` in a fixed ladder — the same reason the order and return
 * timelines are (GAP-46). A step is reached because it happened.
 */
export interface TradeStep {
  key: string;
  at: string | null;
  reached: boolean;
  /** The furthest step reached — drawn aqua with a bold green label, `651:6493`. */
  current: boolean;
}

export function tradeTimeline(
  request: TradeRequest,
  shipments: { shippedAt?: string | null }[] = [],
): TradeStep[] {
  const shipped = shipments
    .map((s) => s.shippedAt)
    .filter((at): at is string => Boolean(at));
  // Both legs travel independently; the step is reached when the later one goes.
  const bothShipped =
    shipments.length > 0 && shipped.length === shipments.length
      ? shipped.sort().at(-1) ?? null
      : null;

  const accepted =
    request.status === "accepted" || request.status === "completed"
      ? request.respondedAt ?? null
      : null;

  const at: [string, string | null][] = [
    ["offered", request.createdAt ?? null],
    ["accepted", accepted],
    ["shipping", bothShipped],
    ["inHub", request.hubReceivedAt ?? null],
    ["inspected", request.inspectedAt ?? null],
    ["completed", request.completedAt ?? null],
  ];

  const lastReached = at.reduce(
    (found, [, when], index) => (when ? index : found),
    -1,
  );

  return at.map(([key, when], index) => ({
    key,
    at: when,
    reached: Boolean(when),
    current: index === lastReached,
  }));
}

/** Resolves the ids trade payloads carry into renderable cards (GAP-83). */
export function pickListings(
  ids: string[],
  index: Map<string, Listing>,
): Listing[] {
  return ids
    .map((id) => index.get(id))
    .filter((listing): listing is Listing => Boolean(listing));
}

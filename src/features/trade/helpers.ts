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
  /** Cards for what the viewer is giving up. */
  mine: Listing[];
  /** Cards for what the viewer is receiving. */
  theirs: Listing[];
  myValue: number;
  theirValue: number;
  /** The other party's user id. */
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
  const offered = (request.offerItems ?? [])
    .map((item) => item.listing)
    .filter((listing): listing is Listing => Boolean(listing));
  const target = request.listing ? [request.listing] : [];

  return {
    isRequester,
    mine: isRequester ? offered : target,
    theirs: isRequester ? target : offered,
    myValue: toNumber(isRequester ? request.offeredValue : request.targetValue),
    theirValue: toNumber(
      isRequester ? request.targetValue : request.offeredValue,
    ),
    counterpartyId: isRequester
      ? (request.responderId ?? request.listing?.sellerId ?? null)
      : request.requesterId,
  };
}

export interface TradeCash {
  /** Cash moving in the viewer's favour. Negative means the viewer pays. */
  difference: number;
  /** The viewer's share of the 1% commission — zero unless they are the payer. */
  commission: number;
  /** Half of `shippingTotal`; the frame labels it "Your shipping share (50%)". */
  shippingShare: number;
  /** `viewerTotal`, negated. Positive is received. */
  net: number;
  /** True when neither side owes cash on top of the swap. */
  isEven: boolean;
}

/**
 * The Cash breakdown panel — `651:6356`.
 *
 * `counterAmount` replaces `autoDifference` once someone counters, and
 * `payerId` carries the direction — never re-derive it from the item values.
 *
 * The net is `viewerTotal`, negated: the API signs it positive when the viewer
 * settles the trade, the panel signs it positive when they are paid. Both
 * totals and `payerId` are computed on read since Round 7, so a row priced
 * before that deploy is corrected on the way out (GAP-95) — there is nothing
 * left here to reconcile or infer.
 */
export function tradeCash(
  request: TradeRequest,
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
  const net = -toNumber(request.viewerTotal);

  if (amount === 0) {
    return { difference: 0, commission, shippingShare, net, isEven: true };
  }

  const viewerPays = Boolean(viewerId) && request.payerId === viewerId;

  return {
    difference: viewerPays ? -amount : amount,
    commission,
    shippingShare,
    net,
    isEven: false,
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

/** Still being negotiated, so the compare-and-decide layout is the right one. */
export function isOpen(status: string): boolean {
  return status === "pending" || status === "countered";
}

/**
 * Who may answer a trade, which is a matter of role as well as state.
 *
 * `pending` is the responder's to accept, counter or decline; `countered` is
 * the requester's to accept or decline, and the responder can do nothing more
 * until they do. The API enforces both — a responder accepting their own
 * counter is *"Only the requester can accept a counter-offer"*, and countering
 * a countered trade is *"Trade request is not pending"*.
 */
export function canDecide(status: string, isRequester: boolean): boolean {
  return status === "pending" ? !isRequester : status === "countered" && isRequester;
}

/** A counter answers a pending offer, and only the target listing's owner sends one. */
export function canCounter(status: string, isRequester: boolean): boolean {
  return status === "pending" && !isRequester;
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

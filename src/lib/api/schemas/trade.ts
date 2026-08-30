import { z } from "zod";
import { listingSchema } from "./listing";

/**
 * Trade — `GET /trade/closet`, `GET /trade/suggestions`, `/trade-requests` and
 * its actions.
 *
 * Shapes are taken from a trade driven end to end on dev (pending → countered →
 * accepted → both legs shipped); the spec documents requests but no responses.
 * Money arrives as decimal strings here, as it does on listings.
 */

const money = z.union([z.string(), z.number()]).nullish();

/** `GET /trade-requests?status=` and the `status` on every row. */
export const TRADE_STATUSES = [
  "pending",
  "countered",
  "accepted",
  "declined",
  "cancelled",
  "expired",
  "completed",
] as const;

export type TradeStatus = (typeof TRADE_STATUSES)[number];

export function isTradeStatus(value: string): value is TradeStatus {
  return (TRADE_STATUSES as readonly string[]).includes(value);
}

/** The three tabs on Web_Trade_OfferReceived / Web_TradeHistory. */
export const TRADE_TABS = ["received", "sent", "history"] as const;
export type TradeTab = (typeof TRADE_TABS)[number];

export function isTradeTab(value: string): value is TradeTab {
  return (TRADE_TABS as readonly string[]).includes(value);
}

/** Statuses the History tab collects — everything past deciding. */
export const HISTORY_STATUSES: TradeStatus[] = [
  "declined",
  "cancelled",
  "expired",
  "completed",
];

/**
 * `fulfillmentStatus` is not enumerated anywhere in the spec; `in_transit_to_hub`
 * is the only value observed. Kept as a string so an unlisted one renders as a
 * label rather than failing validation, with this list driving the timeline.
 */
export const TRADE_FULFILLMENT_TIMELINE = [
  "awaiting_shipment",
  "in_transit_to_hub",
  "at_hub",
  "inspecting",
  "dispatched",
  "completed",
] as const;

export const tradeShipmentSchema = z.object({
  id: z.string(),
  leg: z.string().nullish(),
  status: z.string().nullish(),
  carrier: z.string().nullish(),
  trackingNumber: z.string().nullish(),
  shippedAt: z.string().nullish(),
  deliveredAt: z.string().nullish(),
});

export type TradeShipment = z.infer<typeof tradeShipmentSchema>;

export const tradeInspectionSchema = z.object({
  id: z.string(),
  listingId: z.string().nullish(),
  /** `pending` until the hub rules; then `passed` or `failed`. */
  result: z.string().nullish(),
  notes: z.string().nullish(),
  inspectedAt: z.string().nullish(),
});

export type TradeInspection = z.infer<typeof tradeInspectionSchema>;

/** Ids and a value only — the offered listings are not joined (GAP-83). */
export const tradeOfferItemSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  valueSnapshot: money,
});

export type TradeOfferItem = z.infer<typeof tradeOfferItemSchema>;

const addressSnapshotSchema = z.object({
  recipientName: z.string().nullish(),
  phone: z.string().nullish(),
  street: z.string().nullish(),
  area: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  building: z.string().nullish(),
  apartment: z.string().nullish(),
  postalCode: z.string().nullish(),
});

export const tradeRequestSchema = z.object({
  id: z.string(),
  tradeNumber: z.string().nullish(),
  listingId: z.string(),
  requesterId: z.string(),
  status: z.string(),
  message: z.string().nullish(),
  counterNote: z.string().nullish(),
  counteredAt: z.string().nullish(),
  respondedAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),

  targetValue: money,
  offeredValue: money,
  /** Cash the values differ by before anyone counters. */
  autoDifference: money,
  counterAmount: money,
  /** Who owes the cash. Null while the swap is even. */
  payerId: z.string().nullish(),
  shippingTotal: money,
  commissionAmount: money,
  commissionPayerId: z.string().nullish(),
  requesterTotal: money,
  responderTotal: money,
  currency: z.string().nullish(),

  requesterAddressId: z.string().nullish(),
  requesterAddressSnapshot: addressSnapshotSchema.nullish(),
  responderAddressId: z.string().nullish(),
  responderAddressSnapshot: addressSnapshotSchema.nullish(),

  fulfillmentStatus: z.string().nullish(),
  shipByDeadline: z.string().nullish(),
  hubReceivedAt: z.string().nullish(),
  inspectedAt: z.string().nullish(),
  completedAt: z.string().nullish(),

  escrowStatus: z.string().nullish(),
  escrowAmount: money,
  escrowHeldAt: z.string().nullish(),
  escrowReleasedAt: z.string().nullish(),

  offerItems: z.array(tradeOfferItemSchema).nullish(),
});

export type TradeRequest = z.infer<typeof tradeRequestSchema>;

/** `GET /trade-requests/{id}` joins the target listing and the hub legs. */
export const tradeRequestDetailSchema = tradeRequestSchema.extend({
  listing: listingSchema.nullish(),
  shipments: z.array(tradeShipmentSchema).nullish(),
  inspections: z.array(tradeInspectionSchema).nullish(),
});

export type TradeRequestDetail = z.infer<typeof tradeRequestDetailSchema>;

export const tradeRequestListSchema = z.object({
  items: z.array(tradeRequestSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export const tradeCountsSchema = z.object({
  received: z.number().nullish(),
  sent: z.number().nullish(),
  history: z.number().nullish(),
});

export type TradeCounts = z.infer<typeof tradeCountsSchema>;

/** `GET /trade/closet` — a bare array of listing rows, without photos (GAP-83). */
export const tradeClosetSchema = z.array(listingSchema);

/** `GET /trade/suggestions?filter=`. */
export const TRADE_SUGGESTION_FILTERS = [
  "all",
  "same_category",
  "near_me",
] as const;

export type TradeSuggestionFilter = (typeof TRADE_SUGGESTION_FILTERS)[number];

export function isSuggestionFilter(
  value: string,
): value is TradeSuggestionFilter {
  return (TRADE_SUGGESTION_FILTERS as readonly string[]).includes(value);
}

/** Both sides of a suggestion are id-only stubs — no title, no photo (GAP-83). */
const suggestionSideSchema = z.object({
  id: z.string(),
  sellerId: z.string().nullish(),
  categoryId: z.string().nullish(),
  brandId: z.string().nullish(),
  value: z.number().nullish(),
  city: z.string().nullish(),
});

export const tradeSuggestionSchema = z.object({
  mine: suggestionSideSchema,
  theirs: suggestionSideSchema,
  cashDifference: z.number().nullish(),
  score: z.number().nullish(),
});

export type TradeSuggestion = z.infer<typeof tradeSuggestionSchema>;

export const tradeSuggestionListSchema = z.object({
  items: z.array(tradeSuggestionSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export const COUNTER_NOTE_MAX = 200;
export const CARRIER_MAX = 60;
export const TRACKING_MAX = 80;

import { z } from "zod";

/**
 * Returns — `GET /returns/eligibility/{orderId}`, `POST /returns`,
 * `GET /returns/{id}`.
 *
 * Enums and limits come from `CreateReturnDto` and `AdvanceReturnDto` in the
 * API's OpenAPI document.
 */

const money = z.union([z.string(), z.number()]).nullish();

export const RETURN_REASONS = [
  "doesnt_match_description",
  "wrong_size",
  "damaged_defective",
  "not_authentic",
  "changed_mind",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

/**
 * `evidencePhotos` is required for these three — the API rejects them with
 * *"At least one photo is required for this return reason"*. Until GAP-72
 * landed nothing could turn a picked file into a URL, so they could not be
 * submitted from the web client at all; `POST /media` now can, and the form
 * uploads each photo before creating the return.
 */
export const FAULT_REASONS: ReturnReason[] = [
  "doesnt_match_description",
  "damaged_defective",
  "not_authentic",
];

export function requiresPhotos(reason: string): boolean {
  return FAULT_REASONS.includes(reason as ReturnReason);
}

export const NOTE_MAX = 1000;

/** `AdvanceReturnDto.status`, plus the states the buyer's own actions create. */
export const RETURN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "pickup_scheduled",
  "in_transit",
  "delivered_to_seller",
  "refunded",
  "cancelled",
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

/** The timeline on Web_Returns_StatusTimeline, in the order it advances. */
export const RETURN_TIMELINE: ReturnStatus[] = [
  "requested",
  "approved",
  "pickup_scheduled",
  "in_transit",
  "delivered_to_seller",
  "refunded",
];

export const eligibleItemSchema = z.object({
  orderItemId: z.string(),
  shipmentId: z.string().nullish(),
  sellerId: z.string().nullish(),
  seller: z
    .object({
      id: z.string().nullish(),
      username: z.string().nullish(),
      fullName: z.string().nullish(),
    })
    .nullish(),
  title: z.string().nullish(),
  price: money,
  eligible: z.boolean().nullish(),
  ineligibleReason: z.string().nullish(),
  daysLeftToReturn: z.number().nullish(),
});

export type EligibleItem = z.infer<typeof eligibleItemSchema>;

/**
 * `ReturnEligibilityItemDto.ineligibleReason`, read off the schema published
 * with GAP-94. We had been matching on `window_closed`, which this API has
 * never sent, so an out-of-window item fell through to the generic line.
 */
export const INELIGIBLE_REASONS = [
  "not_delivered",
  "window_expired",
  "final_sale",
  "already_returned",
] as const;

export type IneligibleReason = (typeof INELIGIBLE_REASONS)[number];

export const returnEligibilitySchema = z.object({
  orderId: z.string().nullish(),
  returnWindowDays: z.number().nullish(),
  items: z.array(eligibleItemSchema),
  /** The eligible items' prices, summed. */
  itemsSubtotal: money,
  /**
   * What return shipping *would* cost. This endpoint states the fee rather than
   * applying it, because the reason — which decides the waiver — is chosen on
   * the next screen (GAP-94).
   */
  returnShippingFee: money,
  /** The reasons that waive the fee: the seller's-fault ones. */
  returnShippingWaivedFor: z.array(z.string()).nullish(),
  /** The subtotal, before any deduction. */
  estimatedRefund: money,
  currency: z.string().nullish(),
});

export const returnRequestSchema = z.object({
  id: z.string(),
  /** Human reference, e.g. "R-8928" — shown instead of the uuid. */
  returnNumber: z.string().nullish(),
  orderId: z.string().nullish(),
  status: z.string().nullish(),
  reason: z.string().nullish(),
  reasonNote: z.string().nullish(),
  rejectionReason: z.string().nullish(),
  evidencePhotos: z.array(z.string()).nullish(),
  /**
   * The three rows the refund panel draws (`651:8609`), since GAP-94:
   * `refundAmount` is the **net** — `itemsSubtotal − returnShippingFee` — and
   * the fee is `"0"` when the return is the seller's fault.
   */
  itemsSubtotal: money,
  returnShippingFee: money,
  refundAmount: money,
  /** "Visa •••• 1111" — the method the refund goes back to, already decided. */
  refundMethodSnapshot: z.string().nullish(),
  currency: z.string().nullish(),
  trackingCarrier: z.string().nullish(),
  trackingNumber: z.string().nullish(),

  /**
   * The progress log is a column per state rather than an events array, so a
   * step is drawn as reached because it has a timestamp — never because of
   * where it sits in the list.
   */
  requestedAt: z.string().nullish(),
  approvedAt: z.string().nullish(),
  rejectedAt: z.string().nullish(),
  pickupScheduledAt: z.string().nullish(),
  inTransitAt: z.string().nullish(),
  deliveredAt: z.string().nullish(),
  refundedAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),

  items: z
    .array(
      z.object({
        id: z.string().nullish(),
        /** The order line, not the listing — `listingId` reaches the product. */
        orderItemId: z.string().nullish(),
        titleSnapshot: z.string().nullish(),
        priceSnapshot: money,
        /** Null on a bundle line, and on a listing since deleted (GAP-94). */
        listingId: z.string().nullish(),
        coverPhotoUrl: z.string().nullish(),
        listing: z
          .object({
            id: z.string().nullish(),
            title: z.string().nullish(),
            coverPhotoUrl: z.string().nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
  seller: z
    .object({
      id: z.string().nullish(),
      username: z.string().nullish(),
      fullName: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

/** Which timestamp field marks each step as reached. */
export const RETURN_STEP_FIELDS = {
  requested: "requestedAt",
  approved: "approvedAt",
  pickup_scheduled: "pickupScheduledAt",
  in_transit: "inTransitAt",
  delivered_to_seller: "deliveredAt",
  refunded: "refundedAt",
  rejected: "rejectedAt",
  cancelled: "cancelledAt",
} as const satisfies Record<ReturnStatus, string>;

export type ReturnRequest = z.infer<typeof returnRequestSchema>;

export const returnsListSchema = z.object({
  items: z.array(returnRequestSchema),
  total: z.number().nullish(),
  counts: z.record(z.string(), z.number()).nullish(),
});

export function isReturnReason(value: unknown): value is ReturnReason {
  return RETURN_REASONS.includes(value as ReturnReason);
}

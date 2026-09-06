import { z } from "zod";

/**
 * `GET /orders/shipments` — the seller's own parcels, one per seller per order.
 * This is the seller-side counterpart to `GET /orders`, and the only place a
 * seller can advance an order (`PATCH /orders/shipments/{id}/status`).
 *
 * Round 9 filled this out: `order.buyer`, `order.shippingAddressSnapshot`,
 * `order.vatAmount`, a top-level `earnings` split and a `shipBy` deadline all
 * landed 2026-09-06 (GAP-103, 111, 112, 115). Note the names differ from the
 * response document — `order.buyer` not `buyer`, `shippingAddressSnapshot` not
 * `shippingAddress` — so these are transcribed from the live payload.
 */

const money = z.union([z.string(), z.number()]).nullish();

export const shipmentItemSchema = z.object({
  id: z.string(),
  listingId: z.string().nullish(),
  bundleId: z.string().nullish(),
  /** Snapshots, so a later edit to the listing can't rewrite order history. */
  titleSnapshot: z.string().nullish(),
  priceSnapshot: money,
  finalSale: z.boolean().nullish(),
  coverPhotoUrl: z.string().nullish(),
  listing: z
    .object({
      id: z.string(),
      title: z.string().nullish(),
      coverPhotoUrl: z.string().nullish(),
    })
    .nullish(),
});

/** `source` separates a seller's own transition from a system one. */
export const shipmentEventSchema = z.object({
  id: z.string(),
  status: z.string(),
  occurredAt: z.string().nullish(),
  location: z.string().nullish(),
  note: z.string().nullish(),
  source: z.string().nullish(),
});

export const shipmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  sellerId: z.string().nullish(),
  status: z.string(),

  subtotalAmount: money,
  shippingAmount: money,
  shippingPayer: z.string().nullish(),

  trackingCarrier: z.string().nullish(),
  trackingNumber: z.string().nullish(),
  trackingUrl: z.string().nullish(),
  parcelWeightGrams: z.number().nullish(),

  estDeliveryFrom: z.string().nullish(),
  estDeliveryTo: z.string().nullish(),
  /**
   * Ship-by deadline (GAP-111), 3 days from placement. Null on every shipment
   * created before the Round 9 migration — it was not backfilled — so a null
   * means "no deadline known", never "overdue".
   */
  shipBy: z.string().nullish(),
  packedAt: z.string().nullish(),
  shippedAt: z.string().nullish(),
  deliveredAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  createdAt: z.string().nullish(),

  items: z.array(shipmentItemSchema).nullish(),

  /**
   * The seller's view of the other side of the order (GAP-103).
   *
   * `shippingAddressSnapshot` is a snapshot, so it has no `id` and keeps the
   * address as it was when the order was placed — which is what should be
   * printed on a parcel, even if the buyer edits their address later.
   */
  order: z
    .object({
      orderNumber: z.string().nullish(),
      buyerId: z.string().nullish(),
      currency: z.string().nullish(),
      /** String, like every other money value on a listing (GAP-115). */
      vatAmount: money,
      buyer: z
        .object({
          id: z.string(),
          fullName: z.string().nullish(),
          username: z.string().nullish(),
          profilePic: z.string().nullish(),
        })
        .nullish(),
      shippingAddressSnapshot: z
        .object({
          recipientName: z.string().nullish(),
          phone: z.string().nullish(),
          street: z.string().nullish(),
          area: z.string().nullish(),
          building: z.string().nullish(),
          apartment: z.string().nullish(),
          city: z.string().nullish(),
          postalCode: z.string().nullish(),
          country: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),

  /**
   * The server-computed earnings split (GAP-112) — what the wallet ledger used
   * to be scanned for. Present once the sale settles.
   */
  earnings: z
    .object({
      grossAmount: z.number().nullish(),
      platformFeeAmount: z.number().nullish(),
      shippingAmount: z.number().nullish(),
      shippingDeduction: z.number().nullish(),
      netAmount: z.number().nullish(),
      shippingPayer: z.string().nullish(),
    })
    .nullish(),
  shippingOption: z
    .object({
      code: z.string().nullish(),
      nameEn: z.string().nullish(),
      nameAr: z.string().nullish(),
      price: money,
      etaMinDays: z.number().nullish(),
      etaMaxDays: z.number().nullish(),
      isPickup: z.boolean().nullish(),
      isTracked: z.boolean().nullish(),
    })
    .nullish(),
  events: z.array(shipmentEventSchema).nullish(),
});

export const shipmentsSchema = z.object({
  items: z.array(shipmentSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  tab: z.string().nullish(),
  counts: z.record(z.string(), z.number()).nullish(),
});

export type Shipment = z.infer<typeof shipmentSchema>;
export type ShipmentItem = z.infer<typeof shipmentItemSchema>;
export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

/** The `counts` keys, which are the tabs — note these are not the row statuses. */
export const SHIPMENT_TABS = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type ShipmentTab = (typeof SHIPMENT_TABS)[number];

/** What `PATCH /orders/shipments/{id}/status` accepts. */
export const SHIPMENT_TRANSITIONS = [
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type ShipmentTransition = (typeof SHIPMENT_TRANSITIONS)[number];

/** The next step a seller can take, or null when the parcel is done. */
export function nextTransition(shipment: Shipment): ShipmentTransition | null {
  if (shipment.cancelledAt || shipment.deliveredAt) return null;
  if (shipment.shippedAt) return "delivered";
  if (shipment.packedAt) return "shipped";
  return "packed";
}

export const SHIPMENTS_PAGE_SIZE = 20;

/** The address as it should appear on a parcel label, blank parts dropped. */
export function formatShippingAddress(
  address: NonNullable<NonNullable<Shipment["order"]>["shippingAddressSnapshot"]>,
): string[] {
  const street = [address.building, address.street, address.apartment]
    .filter(Boolean)
    .join(" ");
  return [
    address.recipientName,
    street || null,
    [address.area, address.city].filter(Boolean).join(", ") || null,
    [address.postalCode, address.country].filter(Boolean).join(" ") || null,
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

/**
 * A parcel past its ship-by that still needs the seller (GAP-111).
 *
 * A null `shipBy` is never overdue: shipments created before the Round 9
 * migration were not backfilled, and "unknown" must not read as "late".
 */
export function isOverdue(shipment: Shipment, now: Date = new Date()): boolean {
  if (!shipment.shipBy) return false;
  if (nextTransition(shipment) === null) return false;
  return new Date(shipment.shipBy).getTime() < now.getTime();
}

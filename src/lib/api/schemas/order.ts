import { z } from "zod";

/**
 * Order shapes.
 *
 * Verified against real orders on 2026-08-28 and again on 2026-08-29 — placed,
 * packed, shipped and delivered end to end on dev. What that settled:
 *
 * - `order.items` is **null**. Lines live on `shipments[].items` as
 *   `titleSnapshot` / `priceSnapshot`.
 * - A line carries `coverPhotoUrl` and a `listing { id, title, coverPhotoUrl }`
 *   since GAP-49; both are null for a bundle line or a deleted listing.
 * - Money is decimal strings here, unlike the wallet's numbers.
 *
 * Still permissive where it was: fields the payload doesn't send stay optional
 * rather than being asserted.
 */
const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? null : String(v)));

/**
 * Who covers the parcel (GAP-45). `included_in_price` means the seller absorbs
 * it: the buyer is charged no shipping and it comes off the payout instead.
 * `to_be_agreed` moves money exactly like `buyer_pays` — the two parties settle
 * the difference off-platform.
 */
export const SHIPPING_PAYERS = [
  "buyer_pays",
  "included_in_price",
  "to_be_agreed",
] as const;

export type ShippingPayer = (typeof SHIPPING_PAYERS)[number];

/** From the `status` enum on GET /orders. */
export const SHIPMENT_STATUSES = [
  "placed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** The `tab` enum on GET /orders — note it is NOT the same set as `status`. */
export const ORDER_TABS = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderTab = (typeof ORDER_TABS)[number];

export const orderItemSchema = z
  .object({
    id: z.string().nullish(),
    listingId: z.string().nullish(),
    bundleId: z.string().nullish(),
    /** `titleSnapshot` on a shipment line; `title` on the invoice projection. */
    title: z.string().nullish(),
    titleSnapshot: z.string().nullish(),
    priceSnapshot: money,
    price: money,
    quantity: z.number().nullish(),
    coverPhotoUrl: z.string().nullish(),
    listing: z
      .object({
        id: z.string(),
        title: z.string().nullish(),
        coverPhotoUrl: z.string().nullish(),
        photos: z
          .array(z.object({ url: z.string(), isCover: z.boolean().nullish() }))
          .nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type OrderItem = z.infer<typeof orderItemSchema>;

/**
 * One entry in a shipment's timeline — append-only, oldest first (GAP-27).
 *
 * A transition writes an event rather than mutating one, so this is the record
 * of what happened rather than a projection of the current status. `location`
 * and `note` are seller-entered free text and are frequently absent — design
 * for them missing (plans/09 C13).
 *
 * `source` is `seller | carrier | system`. Only `seller` and `system` occur
 * today; the column exists so a carrier webhook could write here later.
 */
export const shipmentEventSchema = z
  .object({
    id: z.string().nullish(),
    status: z.string(),
    occurredAt: z.string().nullish(),
    location: z.string().nullish(),
    note: z.string().nullish(),
    source: z.string().nullish(),
  })
  .passthrough();

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

export const shippingOptionSchema = z
  .object({
    id: z.string().nullish(),
    code: z.string().nullish(),
    nameEn: z.string().nullish(),
    nameAr: z.string().nullish(),
    price: money,
    etaMinDays: z.number().nullish(),
    etaMaxDays: z.number().nullish(),
    isPickup: z.boolean().nullish(),
    isTracked: z.boolean().nullish(),
  })
  .passthrough();

export const shipmentSchema = z
  .object({
    id: z.string().nullish(),
    sellerId: z.string().nullish(),
    status: z.string().nullish(),
    shippingOptionId: z.string().nullish(),
    subtotalAmount: money,
    /** What the parcel costs to send, whoever pays for it. */
    shippingAmount: money,
    /** Snapshotted from the listing at checkout (GAP-45). */
    shippingPayer: z.enum(SHIPPING_PAYERS).nullish(),
    createdAt: z.string().nullish(),
    /** Carrier fields, all written by the seller by hand (GAP-27). */
    trackingCarrier: z.string().nullish(),
    trackingNumber: z.string().nullish(),
    trackingUrl: z.string().nullish(),
    parcelWeightGrams: z.number().nullish(),
    estDeliveryFrom: z.string().nullish(),
    estDeliveryTo: z.string().nullish(),
    packedAt: z.string().nullish(),
    shippedAt: z.string().nullish(),
    deliveredAt: z.string().nullish(),
    cancelledAt: z.string().nullish(),
    items: z.array(orderItemSchema).nullish(),
    events: z.array(shipmentEventSchema).nullish(),
    seller: z
      .object({
        id: z.string(),
        fullName: z.string().nullish(),
        username: z.string().nullish(),
        profilePic: z.string().nullish(),
        ratingAvg: z.union([z.string(), z.number()]).nullish(),
        ratingCount: z.number().nullish(),
      })
      .passthrough()
      .nullish(),
    shippingOption: shippingOptionSchema.nullish(),
  })
  .passthrough();

export type Shipment = z.infer<typeof shipmentSchema>;

export const orderSchema = z
  .object({
    id: z.string(),
    orderNumber: z.string().nullish(),
    status: z.string().nullish(),
    subtotalAmount: money,
    shippingAmount: money,
    vatAmount: money,
    discountAmount: money,
    donationAmount: money,
    totalAmount: money,
    currency: z.string().nullish(),
    createdAt: z.string().nullish(),
    placedAt: z.string().nullish(),
    items: z.array(orderItemSchema).nullish(),
    shipments: z.array(shipmentSchema).nullish(),
    address: z
      .object({
        recipientName: z.string().nullish(),
        phone: z.string().nullish(),
        street: z.string().nullish(),
        area: z.string().nullish(),
        city: z.string().nullish(),
        country: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type Order = z.infer<typeof orderSchema>;

export const orderCountsSchema = z
  .object({
    all: z.number().nullish(),
    pending: z.number().nullish(),
    processing: z.number().nullish(),
    shipped: z.number().nullish(),
    delivered: z.number().nullish(),
    cancelled: z.number().nullish(),
  })
  .nullish();

export const paginatedOrdersSchema = z.object({
  items: z.array(orderSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  tab: z.string().nullish(),
  counts: orderCountsSchema,
});

export type PaginatedOrders = z.infer<typeof paginatedOrdersSchema>;

/**
 * `GET /orders/{id}/invoice` — a purpose-built projection, not the order.
 *
 * Re-derived from a real invoice on 2026-08-29. The previous shape here was
 * wrong in three ways and every one of them rendered blank rather than failing:
 * totals are nested under `totals` (not `*Amount` at the root), the date is
 * `issueDate` (not `issuedAt`), and a line's money is `lineTotal` (not `price`).
 * So the invoice drew its number and its items with no amounts against them.
 *
 * `issuer`, `billedTo`, `payment` and `shipments` are the blocks the design's
 * header, address columns and payment panel are made of — none of them were
 * being read at all.
 */
export const invoiceIssuerSchema = z
  .object({
    name: z.string().nullish(),
    tagline: z.string().nullish(),
    legalName: z.string().nullish(),
    /** Partly masked by the API, e.g. "300****12003". Rendered as sent. */
    vatRegistration: z.string().nullish(),
    crNumber: z.string().nullish(),
    supportEmail: z.string().nullish(),
    supportPhone: z.string().nullish(),
    city: z.string().nullish(),
  })
  .passthrough();

export const invoiceLineSchema = z
  .object({
    title: z.string().nullish(),
    sellerUsername: z.string().nullish(),
    quantity: z.number().nullish(),
    /** Sent since GAP-63 landed; the frame's PRICE column reads it directly. */
    unitPrice: money.nullish(),
    lineTotal: money,
  })
  .passthrough();

export const invoiceSchema = z
  .object({
    issuer: invoiceIssuerSchema.nullish(),
    invoiceNumber: z.string().nullish(),
    orderNumber: z.string().nullish(),
    issueDate: z.string().nullish(),
    /** "paid" on every invoice observed; the design shows it as a PAID pill. */
    paymentStatus: z.string().nullish(),
    currency: z.string().nullish(),
    billedTo: z
      .object({
        recipientName: z.string().nullish(),
        phone: z.string().nullish(),
        addressLines: z.array(z.string()).nullish(),
      })
      .passthrough()
      .nullish(),
    shippedTo: z
      .object({ sameAsBilling: z.boolean().nullish() })
      .passthrough()
      .nullish(),
    shipments: z
      .array(
        z
          .object({
            sellerUsername: z.string().nullish(),
            carrier: z.string().nullish(),
            trackingNumber: z.string().nullish(),
            status: z.string().nullish(),
          })
          .passthrough(),
      )
      .nullish(),
    items: z.array(invoiceLineSchema).nullish(),
    totals: z
      .object({
        subtotal: money,
        shipping: money,
        vat: money,
        /** A fraction: 0.15. The design prints it as "VAT 15%". */
        vatRate: z.union([z.string(), z.number()]).nullish(),
        discount: money,
        couponCode: z.string().nullish(),
        donation: money,
        donationCharity: z.string().nullish(),
        total: money,
      })
      .passthrough()
      .nullish(),
    payment: z
      .object({
        methodType: z.string().nullish(),
        cardBrand: z.string().nullish(),
        cardLast4: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * The timeline the tracking view renders, newest first, as the design draws it.
 *
 * Built from the shipment's `events` (GAP-27), which carry `placed` from the
 * instant of checkout since GAP-46. The timestamp fallbacks below stay for
 * shipments written before that.
 *
 * `pending` is the one step that hasn't happened: the design shows the next
 * expected status greyed at the foot of the list with its estimated date.
 */
export interface TimelineStep {
  status: string;
  occurredAt?: string | null;
  location?: string | null;
  note?: string | null;
  pending?: boolean;
}

const STATUS_ORDER = ["placed", "packed", "shipped", "delivered"] as const;

export function trackingTimeline(
  shipment: Shipment | undefined,
): TimelineStep[] {
  const events = shipment?.events ?? [];

  const steps: TimelineStep[] = events.map((event) => ({
    status: event.status,
    occurredAt: event.occurredAt,
    location: event.location,
    note: event.note,
  }));

  // Fall back to the shipment's own timestamps when the log is empty.
  const stamps: Record<string, string | null | undefined> = {
    placed: shipment?.createdAt,
    packed: shipment?.packedAt,
    shipped: shipment?.shippedAt,
    delivered: shipment?.deliveredAt,
  };
  for (const [status, occurredAt] of Object.entries(stamps)) {
    if (occurredAt && !steps.some((step) => step.status === status)) {
      steps.push({ status, occurredAt });
    }
  }

  if (shipment?.cancelledAt) {
    steps.push({ status: "cancelled", occurredAt: shipment.cancelledAt });
  }

  steps.sort((a, b) => {
    const at = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bt = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bt - at;
  });

  // The next status that hasn't happened, greyed at the foot of the list.
  if (!shipment?.cancelledAt) {
    const reached = new Set(steps.map((step) => step.status));
    const next = STATUS_ORDER.find((status) => !reached.has(status));
    if (next) steps.push({ status: next, pending: true });
  }

  return steps;
}

/**
 * The order's line count and status, which the list response does not carry
 * directly: `order.items` is null and there is no `status` column — both live
 * on `shipments[]` (GAP-78).
 */
export function orderLineCount(order: Order): number {
  return (order.shipments ?? []).reduce(
    (total, shipment) => total + (shipment.items?.length ?? 0),
    0,
  );
}

/** The least-advanced shipment status — an order is only as far as its slowest parcel. */
export function orderStatus(order: Order): string | null {
  const statuses = (order.shipments ?? [])
    .map((shipment) => shipment.status)
    .filter((status): status is string => Boolean(status));
  if (statuses.length === 0) return null;

  const rank = (status: string) => {
    const index = SHIPMENT_STATUSES.indexOf(
      status as (typeof SHIPMENT_STATUSES)[number],
    );
    return index === -1 ? SHIPMENT_STATUSES.length : index;
  };
  return statuses.reduce((slowest, status) =>
    rank(status) < rank(slowest) ? status : slowest,
  );
}

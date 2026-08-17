import { z } from "zod";

/**
 * Order shapes.
 *
 * Deliberately permissive. Unlike the cart and checkout contracts — which we
 * verified against live responses — no order exists on our probe account yet,
 * so these are inferred from the DTOs, the admin endpoint descriptions and the
 * status enums the spec does document. Everything optional, nothing assumed.
 *
 * Tighten these once a real order can be read end to end.
 */
const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? null : String(v)));

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
    title: z.string().nullish(),
    price: money,
    quantity: z.number().nullish(),
    coverPhotoUrl: z.string().nullish(),
    listing: z
      .object({
        id: z.string(),
        title: z.string().nullish(),
        photos: z
          .array(z.object({ url: z.string(), isCover: z.boolean().nullish() }))
          .nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export type OrderItem = z.infer<typeof orderItemSchema>;

export const shipmentSchema = z
  .object({
    id: z.string().nullish(),
    sellerId: z.string().nullish(),
    status: z.string().nullish(),
    shippingOptionId: z.string().nullish(),
    /**
     * No carrier or tracking number exists for outbound shipments —
     * `UpdateShipmentStatusDto` accepts only `status`. Declared optional so the
     * UI lights up automatically if the backend adds them. See GAP-27.
     */
    trackingCarrier: z.string().nullish(),
    trackingNumber: z.string().nullish(),
    packedAt: z.string().nullish(),
    shippedAt: z.string().nullish(),
    deliveredAt: z.string().nullish(),
    cancelledAt: z.string().nullish(),
    items: z.array(orderItemSchema).nullish(),
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

export const invoiceSchema = z
  .object({
    orderId: z.string().nullish(),
    invoiceNumber: z.string().nullish(),
    issuedAt: z.string().nullish(),
    subtotalAmount: money,
    shippingAmount: money,
    vatAmount: money,
    vatRate: z.union([z.string(), z.number()]).nullish(),
    discountAmount: money,
    totalAmount: money,
    currency: z.string().nullish(),
    items: z.array(orderItemSchema).nullish(),
  })
  .passthrough();

export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * Timeline steps for the tracking view, in order.
 *
 * Derived from shipment status rather than a server-provided event log — the
 * API exposes no per-event history with timestamps and locations, so the design's
 * location lines ("Riyadh hub", "Jeddah Warehouse") can't be populated. See
 * GAP-27.
 */
export const TRACKING_STEPS = [
  { key: "placed", statuses: ["placed", "packed", "shipped", "delivered"] },
  { key: "packed", statuses: ["packed", "shipped", "delivered"] },
  { key: "shipped", statuses: ["shipped", "delivered"] },
  { key: "delivered", statuses: ["delivered"] },
] as const;

export function stepReached(step: readonly string[], status?: string | null) {
  return Boolean(status && step.includes(status));
}

import type { Order, OrderItem } from "@/lib/api/schemas/order";

/**
 * Order helpers.
 *
 * These exist because the order payload shape isn't documented (API-05) and we
 * have no populated order to observe yet, so each accessor tolerates a couple of
 * plausible field names rather than assuming one. Collapse them once a real
 * order can be read.
 */

/** Human-facing order reference, falling back to a short id. */
export function orderReference(order: Order): string {
  if (order.orderNumber) return order.orderNumber;
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

/**
 * Effective status.
 *
 * An order can hold several shipments (one per seller). Until all of them are
 * delivered the order is not delivered, so the *least* advanced shipment wins —
 * reporting "delivered" while one seller hasn't shipped would be wrong.
 */
export function orderStatus(order: Order): string {
  const shipmentStatuses = (order.shipments ?? [])
    .map((s) => s.status)
    .filter((s): s is string => Boolean(s));

  if (shipmentStatuses.length === 0) return order.status ?? "placed";

  const rank = ["cancelled", "placed", "packed", "shipped", "delivered"];
  return shipmentStatuses.reduce((least, current) =>
    rank.indexOf(current) < rank.indexOf(least) ? current : least,
  );
}

/** Cover image for an order line, wherever the payload happens to carry it. */
export function orderItemImage(item: OrderItem): string | null {
  if (item.coverPhotoUrl) return item.coverPhotoUrl;
  const photos = item.listing?.photos ?? [];
  const cover = photos.find((p) => p.isCover) ?? photos[0];
  return cover?.url ?? null;
}

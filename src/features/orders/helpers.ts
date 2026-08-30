import type { Order, OrderItem } from "@/lib/api/schemas/order";

/**
 * Order helpers.
 *
 * These exist because the order payload shape isn't documented (API-05) and we
 * have no populated order to observe yet, so each accessor tolerates a couple of
 * plausible field names rather than assuming one. Collapse them once a real
 * order can be read.
 */

/**
 * Human-facing order reference, falling back to a short id.
 *
 * Always `#`-prefixed — the design writes it that way wherever it appears
 * (`#YS-20260412-9847` on `651:8043`), and `orderNumber` doesn't carry one.
 */
export function orderReference(order: Order): string {
  if (order.orderNumber) return `#${order.orderNumber}`;
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

/**
 * Title of an order line. The shipment payload calls it `titleSnapshot` — the
 * name at the time of sale, which is the right one to show even if the seller
 * has since renamed the listing. The invoice projection calls it `title`.
 */
export function orderItemTitle(item?: OrderItem): string | null {
  if (!item) return null;
  return item.titleSnapshot ?? item.title ?? item.listing?.title ?? null;
}

/**
 * Money for an order line. The shipment payload calls it `priceSnapshot` — what
 * was actually charged — and the invoice projection calls it `price`. Reading
 * only `price` renders a blank amount against every real line.
 */
export function orderItemPrice(item: OrderItem): string | null {
  return item.priceSnapshot ?? item.price ?? null;
}

/**
 * Cover image for an order line (GAP-49). Flat `coverPhotoUrl` first, then the
 * nested `listing` the wallet row uses. Null for a bundle line or a listing
 * that has since been deleted — both come back with the line intact.
 */
export function orderItemImage(item?: OrderItem): string | null {
  if (!item) return null;
  if (item.coverPhotoUrl) return item.coverPhotoUrl;
  if (item.listing?.coverPhotoUrl) return item.listing.coverPhotoUrl;
  const photos = item.listing?.photos ?? [];
  const cover = photos.find((p) => p.isCover) ?? photos[0];
  return cover?.url ?? null;
}

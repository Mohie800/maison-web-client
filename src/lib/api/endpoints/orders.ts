import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  invoiceSchema,
  orderSchema,
  paginatedOrdersSchema,
  type Invoice,
  type Order,
  type OrderTab,
  type PaginatedOrders,
} from "../schemas/order";
import { reviewableSchema } from "../schemas/review";

export const ORDERS_PAGE_SIZE = 10;

/**
 * Buyer's orders.
 *
 * `tab` and the `counts` object landed in the backend's gaps drop and are
 * verified working, so the tab bar is server-filtered rather than filtered in
 * the browser over one page.
 */
export async function getOrders(
  tab: OrderTab = "all",
  page = 1,
): Promise<PaginatedOrders> {
  const data = await serverApiFetch<unknown>("/orders", {
    params: { tab, page, limit: ORDERS_PAGE_SIZE },
  });
  return parseResponse(paginatedOrdersSchema, data, "GET /orders");
}

/** A single order. Returns null when it doesn't exist or isn't ours. */
export async function getOrder(id: string): Promise<Order | null> {
  try {
    const data = await serverApiFetch<unknown>(`/orders/${id}`);
    return parseResponse(orderSchema, data, `GET /orders/${id}`);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.isNotFound || error.isForbidden || error.isUnauthorized)
    ) {
      return null;
    }
    throw error;
  }
}

/** Tax invoice projection. Non-fatal — the order page renders without it. */
export async function getInvoice(orderId: string): Promise<Invoice | null> {
  try {
    const data = await serverApiFetch<unknown>(`/orders/${orderId}/invoice`);
    return parseResponse(invoiceSchema, data, `GET /orders/${orderId}/invoice`);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/**
 * Delivered items in an order that the buyer has not reviewed yet.
 * `GET /reviews/orders/{orderId}/reviewable` — buyer only.
 */
export async function getReviewableItems(orderId: string) {
  const data = await serverApiFetch<unknown>(
    `/reviews/orders/${orderId}/reviewable`,
    { cache: "no-store" },
  );
  return parseResponse(
    reviewableSchema,
    data,
    "GET /reviews/orders/{id}/reviewable",
  );
}

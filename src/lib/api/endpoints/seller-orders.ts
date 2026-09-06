import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  shipmentSchema,
  shipmentsSchema,
  SHIPMENTS_PAGE_SIZE,
  type ShipmentTab,
} from "../schemas/shipment";

/**
 * The seller's side of an order — `GET /orders/shipments`, which had no screen
 * until the Vendor Portal (plans/06 G8).
 */

export async function getSellerOrders(
  query: { status?: ShipmentTab; page?: number } = {},
) {
  const data = await serverApiFetch<unknown>("/orders/shipments", {
    params: {
      ...(query.status && query.status !== "all" ? { status: query.status } : {}),
      page: query.page ?? 1,
      limit: SHIPMENTS_PAGE_SIZE,
    },
  });
  return parseResponse(shipmentsSchema, data, "GET /orders/shipments");
}

export async function getSellerOrder(id: string) {
  try {
    const data = await serverApiFetch<unknown>(`/orders/shipments/${id}`);
    return parseResponse(shipmentSchema, data, "GET /orders/shipments/{id}");
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

/**
 * Returns the buyer has opened against this seller — `GET /returns/incoming`.
 *
 * The Orders list needs it only to mark a row "Returned": a shipment carries no
 * return state of its own, so the two are joined on `shipmentId` here.
 */
export async function getIncomingReturnShipmentIds(): Promise<Set<string>> {
  try {
    const data = await serverApiFetch<{ items?: { shipmentId?: string | null }[] }>(
      "/returns/incoming",
    );
    return new Set(
      (data?.items ?? [])
        .map((row) => row.shipmentId)
        .filter((id): id is string => Boolean(id)),
    );
  } catch {
    // Non-fatal: without it a returned row simply shows its shipment status.
    return new Set();
  }
}



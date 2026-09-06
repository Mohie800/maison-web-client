import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  vendorDashboardSchema,
  vendorDemographicsSchema,
  vendorDiscountStatsSchema,
  vendorDiscountsSchema,
  vendorInsightsSchema,
  vendorPayoutSummarySchema,
  vendorPayoutsSchema,
  vendorRecentOrdersSchema,
  vendorSalesSchema,
  vendorTopProductsSchema,
  VENDOR_PAGE_SIZE,
  type DateWindow,
  type DiscountTab,
  type PayoutStatus,
  type TopProductSort,
} from "../schemas/vendor";

/**
 * Vendor Portal reads. All require a session — `(vendor)` is gated by
 * `proxy.ts`, so a signed-out visitor never reaches these.
 *
 * `startDate` / `endDate` are the only window params: `period`, `days` and
 * `sort` all 400 with "property should not exist".
 */

/** Defaults to the trailing 30 days, which is what the API assumes anyway. */
export function trailingWindow(days = 30, today = new Date()): DateWindow {
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

export async function getVendorDashboard(window: DateWindow = {}) {
  const data = await serverApiFetch<unknown>("/vendor-portal/dashboard", {
    params: { ...window },
  });
  return parseResponse(
    vendorDashboardSchema,
    data,
    "GET /vendor-portal/dashboard",
  );
}

export async function getVendorRecentOrders(
  query: { page?: number; limit?: number } = {},
) {
  const data = await serverApiFetch<unknown>("/vendor-portal/recent-orders", {
    params: { page: query.page ?? 1, limit: query.limit ?? VENDOR_PAGE_SIZE },
  });
  return parseResponse(
    vendorRecentOrdersSchema,
    data,
    "GET /vendor-portal/recent-orders",
  );
}

export async function getVendorSales(window: DateWindow = {}) {
  const data = await serverApiFetch<unknown>("/vendor-portal/sales", {
    params: { ...window },
  });
  return parseResponse(vendorSalesSchema, data, "GET /vendor-portal/sales");
}

export async function getVendorTopProducts(
  query: DateWindow & {
    page?: number;
    limit?: number;
    /** GAP-113 — the frame's metric tabs. Defaults to revenue server-side. */
    sort?: TopProductSort;
  } = {},
) {
  const { page, limit, sort, ...window } = query;
  const data = await serverApiFetch<unknown>("/vendor-portal/top-products", {
    params: {
      ...window,
      ...(sort ? { sort } : {}),
      page: page ?? 1,
      limit: limit ?? VENDOR_PAGE_SIZE,
    },
  });
  return parseResponse(
    vendorTopProductsSchema,
    data,
    "GET /vendor-portal/top-products",
  );
}

export async function getVendorInsights(window: DateWindow = {}) {
  const data = await serverApiFetch<unknown>("/vendor-portal/customers/insights", {
    params: { ...window },
  });
  return parseResponse(
    vendorInsightsSchema,
    data,
    "GET /vendor-portal/customers/insights",
  );
}

/** Honours the window since Round 9 (GAP-108). */
export async function getVendorDemographics(window: DateWindow = {}) {
  const data = await serverApiFetch<unknown>(
    "/vendor-portal/customers/demographics",
    { params: { ...window } },
  );
  return parseResponse(
    vendorDemographicsSchema,
    data,
    "GET /vendor-portal/customers/demographics",
  );
}

/**
 * Since Round 9 this returns every discount, scheduled ones included, and takes
 * a `tab` filter matching the stats buckets (GAP-104). `status` is accepted as
 * an alias; we send `tab`, which is the documented name.
 */
export async function getVendorDiscounts(
  query: { page?: number; limit?: number; tab?: DiscountTab } = {},
) {
  const data = await serverApiFetch<unknown>("/vendor-portal/discounts", {
    params: {
      page: query.page ?? 1,
      limit: query.limit ?? VENDOR_PAGE_SIZE,
      ...(query.tab && query.tab !== "all" ? { tab: query.tab } : {}),
    },
  });
  return parseResponse(
    vendorDiscountsSchema,
    data,
    "GET /vendor-portal/discounts",
  );
}

export async function getVendorDiscountStats() {
  const data = await serverApiFetch<unknown>("/vendor-portal/discounts/stats");
  return parseResponse(
    vendorDiscountStatsSchema,
    data,
    "GET /vendor-portal/discounts/stats",
  );
}

export async function getVendorPayoutSummary() {
  const data = await serverApiFetch<unknown>("/vendor-portal/payouts/summary");
  return parseResponse(
    vendorPayoutSummarySchema,
    data,
    "GET /vendor-portal/payouts/summary",
  );
}

export async function getVendorPayouts(
  query: { page?: number; limit?: number; status?: PayoutStatus } = {},
) {
  const data = await serverApiFetch<unknown>("/vendor-portal/payouts/history", {
    params: {
      page: query.page ?? 1,
      limit: query.limit ?? VENDOR_PAGE_SIZE,
      ...(query.status ? { status: query.status } : {}),
    },
  });
  return parseResponse(
    vendorPayoutsSchema,
    data,
    "GET /vendor-portal/payouts/history",
  );
}

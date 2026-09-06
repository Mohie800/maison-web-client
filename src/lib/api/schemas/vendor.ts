import { z } from "zod";

/**
 * Vendor Portal shapes (Flow 15), derived from live responses.
 *
 * Round 9 landed 2026-09-06 and widened most of these: absolute `change`
 * deltas, a `followers` metric, `avgDailyRevenue`, `unitsSold`,
 * `conversionRate`, a `category` on top products, a real `chartData` on
 * insights, and payout endpoints that finally read the wallet ledger. The
 * discount DTOs are documented now too, so those are the spec's shapes rather
 * than ours.
 *
 * Every `/vendor-portal/*` route answers 200 for an `accountType: individual`
 * account, so the portal is scoped to "any seller", not to business accounts.
 */

/** Money is a number on most of these, a string on the discount rows. */
const money = z.union([z.string(), z.number()]).nullish();

/** `startDate` / `endDate` (YYYY-MM-DD) — the only window params accepted. */
export interface DateWindow {
  startDate?: string;
  endDate?: string;
}

/* -------------------------------------------------------------------------- */
/* Dashboard — 01_VP_Dashboard                                                */
/* -------------------------------------------------------------------------- */

/** `changePercent` is null when there is no prior window to compare against. */
const metricSchema = z.object({
  value: z.number().nullish(),
  /** Absolute delta over the prior window of the same length (GAP-109). */
  change: z.number().nullish(),
  changePercent: z.number().nullish(),
  /** Products only: listings created inside the window. */
  newCount: z.number().nullish(),
});

export const vendorDashboardSchema = z.object({
  storeName: z.string().nullish(),
  revenue: metricSchema,
  orders: metricSchema,
  visits: metricSchema,
  products: metricSchema,
  /** GAP-109 — no longer joined from `/sellers/{id}`. */
  followers: metricSchema.nullish(),
  /** Server-computed, so the client never divides money (GAP-113). */
  avgDailyRevenue: z.number().nullish(),
  currency: z.string().nullish(),
});

export type VendorDashboard = z.infer<typeof vendorDashboardSchema>;
export type VendorMetric = z.infer<typeof metricSchema>;

/* -------------------------------------------------------------------------- */
/* Recent orders — 01_VP_Dashboard, 03_VP_Orders                              */
/* -------------------------------------------------------------------------- */

export const vendorOrderRowSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullish(),
  totalAmount: money,
  status: z.string().nullish(),
  itemCount: z.number().nullish(),
  placedAt: z.string().nullish(),
  /** GAP-110 — the row can name the item now, not just the order. */
  firstItemTitle: z.string().nullish(),
  coverPhoto: z.string().nullish(),
  buyer: z
    .object({
      id: z.string(),
      fullName: z.string().nullish(),
      username: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

export const vendorRecentOrdersSchema = z.object({
  items: z.array(vendorOrderRowSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export type VendorOrderRow = z.infer<typeof vendorOrderRowSchema>;

/* -------------------------------------------------------------------------- */
/* Sales — 07_VP_SalesAnalytics                                               */
/* -------------------------------------------------------------------------- */

export const salesPointSchema = z.object({
  date: z.string(),
  amount: z.number().nullish(),
  orderCount: z.number().nullish(),
});

/** One point per day across the window, zero-filled — safe to plot directly. */
export const vendorSalesSchema = z.object({
  totalSales: z.number().nullish(),
  totalOrders: z.number().nullish(),
  avgBasketSize: z.number().nullish(),
  /** GAP-113. `conversionRate` is null rather than 0 when there are no visits. */
  unitsSold: z.number().nullish(),
  conversionRate: z.number().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  currency: z.string().nullish(),
  chartData: z.array(salesPointSchema),
});

export type VendorSales = z.infer<typeof vendorSalesSchema>;
export type SalesPoint = z.infer<typeof salesPointSchema>;

/* -------------------------------------------------------------------------- */
/* Top products — 09_VP_TopProducts                                           */
/* -------------------------------------------------------------------------- */

/** `coverPhoto` here, not the `coverPhotoUrl` every other listing shape uses. */
export const topProductSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  coverPhoto: z.string().nullish(),
  /** GAP-113 — the row's category label. */
  category: z.object({ id: z.string(), name: z.string().nullish() }).nullish(),
  soldCount: z.number().nullish(),
  revenue: money,
  price: money,
});

/** What `?sort=` accepts on `/vendor-portal/top-products` (GAP-113). */
export const TOP_PRODUCT_SORTS = [
  "revenue",
  "units_sold",
  "price_asc",
  "price_desc",
] as const;
export type TopProductSort = (typeof TOP_PRODUCT_SORTS)[number];

export const vendorTopProductsSchema = z.object({
  items: z.array(topProductSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export type TopProduct = z.infer<typeof topProductSchema>;

/* -------------------------------------------------------------------------- */
/* Customers — 08_VP_CustomerInsights                                         */
/* -------------------------------------------------------------------------- */

/** One point per day across the window, zero-filled, since GAP-107. */
export const visitsPointSchema = z.object({
  date: z.string(),
  visits: z.number().nullish(),
  uniqueVisitors: z.number().nullish(),
});
export const vendorInsightsSchema = z.object({
  totalVisits: z.number().nullish(),
  visitsChange: z.number().nullish(),
  uniqueCustomers: z.number().nullish(),
  uniqueCustomersChange: z.number().nullish(),
  returningCustomers: z.number().nullish(),
  returningRate: z.number().nullish(),
  /**
   * Still 0. Session duration is not tracked, and the backend said as much
   * rather than inventing a figure, so the tile stays cut (plans/09 C76).
   */
  avgTimeOnPage: z.number().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  chartData: z.array(visitsPointSchema).nullish(),
});

export type VisitsPoint = z.infer<typeof visitsPointSchema>;

export type VendorInsights = z.infer<typeof vendorInsightsSchema>;

/** `percentage` is server-computed; never re-derive it from `count`. */
export const vendorDemographicsSchema = z.object({
  byCity: z.array(
    z.object({
      city: z.string().nullish(),
      count: z.number().nullish(),
      percentage: z.number().nullish(),
    }),
  ),
  byCountry: z.array(
    z.object({
      country: z.string().nullish(),
      count: z.number().nullish(),
      percentage: z.number().nullish(),
    }),
  ),
});

export type VendorDemographics = z.infer<typeof vendorDemographicsSchema>;

/* -------------------------------------------------------------------------- */
/* Discounts — 17_VP_Discounts, 18_VP_CreateDiscount                          */
/* -------------------------------------------------------------------------- */

/** The buckets `?tab=` accepts, matching what `/discounts/stats` counts. */
export const DISCOUNT_TABS = ["all", "active", "scheduled", "expired"] as const;
export type DiscountTab = (typeof DISCOUNT_TABS)[number];

export const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/**
 * `discountValue` is a string on create/update and a number on the list row, so
 * both are accepted (GAP-105).
 */
export const vendorDiscountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().nullish(),
  sellerId: z.string().nullish(),
  discountType: z.string().nullish(),
  discountValue: money,
  maxDiscountAmount: money,
  minOrderAmount: money,
  usageLimit: z.number().nullish(),
  usedCount: z.number().nullish(),
  startsAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  isActive: z.boolean().nullish(),
  createdAt: z.string().nullish(),
});

export const vendorDiscountsSchema = z.object({
  items: z.array(vendorDiscountSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export const vendorDiscountStatsSchema = z.object({
  activeCount: z.number().nullish(),
  scheduledCount: z.number().nullish(),
  expiredCount: z.number().nullish(),
  totalUsed: z.number().nullish(),
  customerSavings: money,
  currency: z.string().nullish(),
});

export type VendorDiscount = z.infer<typeof vendorDiscountSchema>;
export type VendorDiscountStats = z.infer<typeof vendorDiscountStatsSchema>;

/** The create contract, recovered from the validator — the spec has none. */
export interface CreateDiscountInput {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

/**
 * Which bucket a row falls in, since the list carries no status of its own and
 * takes no status filter (GAP-104). Mirrors what `/discounts/stats` counts.
 */
export function discountStatus(
  discount: VendorDiscount,
  now: Date = new Date(),
): "active" | "scheduled" | "expired" | "inactive" {
  if (discount.isActive === false) return "inactive";
  if (discount.expiresAt && new Date(discount.expiresAt) < now) return "expired";
  if (discount.startsAt && new Date(discount.startsAt) > now) return "scheduled";
  return "active";
}

/* -------------------------------------------------------------------------- */
/* Payouts — 15_VP_Payouts                                                    */
/* -------------------------------------------------------------------------- */

export const PAYOUT_STATUSES = [
  "all",
  "completed",
  "pending",
  "in_transit",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** `payoutDestination` is null until a bank account is linked. */
export const payoutDestinationSchema = z.object({
  id: z.string().nullish(),
  bankName: z.string().nullish(),
  ibanLast4: z.string().nullish(),
  accountHolder: z.string().nullish(),
});

export const vendorPayoutSummarySchema = z.object({
  availableBalance: money,
  changePercent: z.number().nullish(),
  totalPaid: money,
  inTransit: money,
  transactionCount: z.number().nullish(),
  currency: z.string().nullish(),
  payoutDestination: payoutDestinationSchema.nullish(),
});

/** A settled withdrawal. Verified against a real one on 2026-09-06 (GAP-106). */
export const vendorPayoutSchema = z.object({
  id: z.string(),
  amount: money,
  status: z.string().nullish(),
  note: z.string().nullish(),
  bankInfo: z.string().nullish(),
  createdAt: z.string().nullish(),
  completedAt: z.string().nullish(),
});

export const vendorPayoutsSchema = z.object({
  items: z.array(vendorPayoutSchema),
  total: z.number(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

export type VendorPayoutSummary = z.infer<typeof vendorPayoutSummarySchema>;

export const VENDOR_PAGE_SIZE = 20;

export type VendorPayout = z.infer<typeof vendorPayoutSchema>;

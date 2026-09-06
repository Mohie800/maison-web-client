import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import {
  getVendorDashboard,
  getVendorPayoutSummary,
  getVendorRecentOrders,
  getVendorSales,
  trailingWindow,
} from "@/lib/api/endpoints/vendor";
import { formatCount, formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { StatCard } from "@/features/vendor/components/stat-card";
import {
  RevenueChart,
  type SalesRange,
} from "@/features/vendor/components/revenue-chart";
import { statusTone } from "@/features/vendor/status";

/**
 * Vendor dashboard — `651:13488` (light) / `651:10849` (dark).
 *
 * Round 9 (2026-09-06) closed both of this screen's joins. **Followers** is a
 * first-class dashboard metric now, and every metric carries an absolute
 * `change` beside its `changePercent` (GAP-109) — so the count cards read "+2"
 * as designed, and only the money cards use a percentage.
 *
 * **Active Products**' "3 pending" is still `/listings/me`'s `counts.pending`:
 * `products.newCount` counts listings *created* in the window, which is a
 * different number and not what the frame asks for.
 */
export const metadata: Metadata = { robots: { index: false } };

const DAYS: Record<SalesRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

function greetingKey(): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** "+44.8%" — money cards, where a proportion is the meaningful figure. */
function deltaPercent(changePercent: number | null | undefined): string | null {
  if (changePercent === null || changePercent === undefined) return null;
  const rounded = Math.round(changePercent * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * "+8" — count cards, which is what the frame draws (GAP-109).
 *
 * On a base of two orders "+100%" says much less than "+2", which is why the
 * design asked for it and why we chased the field.
 */
function deltaCount(change: number | null | undefined): string | null {
  if (change === null || change === undefined || change === 0) return null;
  return `${change > 0 ? "+" : ""}${change}`;
}

export default async function VendorDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { range: rawRange } = await searchParams;
  const range: SalesRange =
    rawRange === "7d" || rawRange === "90d" ? rawRange : "30d";
  const window = trailingWindow(DAYS[range]);

  const t = await getTranslations("Vendor");
  const user = await getCurrentUser();

  const [dashboard, sales, recent, payouts, listings] = await Promise.all([
    getVendorDashboard(window).catch(() => null),
    getVendorSales(window).catch(() => null),
    getVendorRecentOrders({ limit: 3 }).catch(() => null),
    getVendorPayoutSummary().catch(() => null),
    getMyListings({ filter: "all" }).catch(() => null),
  ]);

  const currency = dashboard?.currency ?? sales?.currency ?? "SAR";
  const storeName = dashboard?.storeName ?? user?.fullName ?? "";
  const firstName = (user?.fullName ?? "").split(" ")[0];
  const pending = listings?.counts?.pending ?? 0;

  return (
    <>
      {/* TB — 651:13542 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
            {t(`greeting.${greetingKey()}`, { name: firstName })}
          </h1>
          <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4" dir="auto">
            {storeName} · {formatDate(new Date(), locale as Locale)}
          </p>
        </div>
        <Link
          href="/sell"
          className="bg-action text-base flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold"
        >
          {t("addListing")}
        </Link>
      </div>

      {/* KPI — 651:13548 */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatPrice(dashboard?.revenue?.value ?? 0, currency)}
          label={t("kpi.revenue")}
          badge={deltaPercent(dashboard?.revenue?.changePercent)}
        />
        <StatCard
          value={formatCount(dashboard?.orders?.value ?? 0, locale as Locale)}
          label={t("kpi.newOrders")}
          badge={deltaCount(dashboard?.orders?.change)}
        />
        <StatCard
          value={formatCount(dashboard?.followers?.value ?? 0, locale as Locale)}
          label={t("kpi.followers")}
          badge={deltaCount(dashboard?.followers?.change)}
        />
        <StatCard
          value={formatCount(dashboard?.products?.value ?? 0, locale as Locale)}
          label={t("kpi.activeProducts")}
          badge={pending > 0 ? t("kpi.pending", { count: pending }) : null}
          tone="alert"
        />
      </div>

      {/* R1 — 651:13573 */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <section className="bg-base dark:bg-tint border-line-200 rounded-[14px] flex flex-col gap-4 border p-5 xl:w-[692px]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-ink-900 text-[15px] leading-[18px] font-semibold">
              {t("revenue.title")}
            </h2>
            {sales?.startDate && sales?.endDate && (
              <p className="text-ink-500 dark:text-ink-450 shrink-0 text-[11px]">
                {formatDate(sales.startDate, locale as Locale)} –{" "}
                {formatDate(sales.endDate, locale as Locale)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-ink-900 text-[22px] leading-[27px] font-bold">
              {formatPrice(sales?.totalSales ?? 0, currency)}
            </p>
            {deltaPercent(dashboard?.revenue?.changePercent) && (
              <span
                dir="ltr"
                className="bg-vp-action text-action dark:text-aqua flex h-6 items-center rounded-[12px] px-2 text-[11px] font-bold"
              >
                {deltaPercent(dashboard?.revenue?.changePercent)}
              </span>
            )}
          </div>

          <RevenueChart
            points={sales?.chartData ?? []}
            range={range}
            title={t("revenue.chart")}
            rangeLabels={{
              "7d": t("revenue.range.7d"),
              "30d": t("revenue.range.30d"),
              "90d": t("revenue.range.90d"),
            }}
          />
        </section>

        {/* RecentOrd — 651:13599 */}
        <section className="bg-base dark:bg-tint border-line-200 flex flex-col gap-3.5 rounded-[14px] border p-5 xl:w-[408px]">
          <div className="flex items-center justify-between">
            <h2 className="text-ink-900 text-[15px] leading-[18px] font-semibold">
              {t("recentOrders.title")}
            </h2>
            <Link
              href="/vendor/orders"
              className="text-action text-[11px] font-medium"
            >
              {t("recentOrders.viewAll")}
            </Link>
          </div>

          {(recent?.items ?? []).length === 0 ? (
            <p className="text-ink-500 dark:text-ink-450 py-2 text-[12px]">
              {t("recentOrders.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {(recent?.items ?? []).map((order) => (
                <li key={order.id}>
                  {/* Item title over the buyer's @handle, as drawn (GAP-110). */}
                  <div className="flex items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 flex-col gap-[2px]">
                      <p
                        className="text-ink-900 truncate text-[12px] leading-[15px] font-semibold"
                        dir="auto"
                      >
                        {order.firstItemTitle ?? order.orderNumber}
                        {(order.itemCount ?? 0) > 1 && (
                          <span className="text-ink-500 dark:text-ink-450 font-normal">
                            {" "}
                            +{(order.itemCount ?? 1) - 1}
                          </span>
                        )}
                      </p>
                      <p
                        className="text-ink-500 dark:text-ink-450 truncate text-[10px] leading-3"
                        dir={order.buyer?.username ? "ltr" : "auto"}
                      >
                        {order.buyer?.username
                          ? `@${order.buyer.username}`
                          : order.buyer?.fullName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <p className="text-ink-900 text-[12px] font-bold">
                        {formatPrice(order.totalAmount, currency)}
                      </p>
                      <span
                        className={`flex h-[22px] items-center rounded-[11px] px-2 text-[10px] font-bold ${statusTone(order.status)}`}
                      >
                        {t(`status.${order.status}`)}
                      </span>
                    </div>
                  </div>
                  <span className="bg-line-200 mt-3.5 block h-px" aria-hidden />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* R2 — 651:13630 */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatPrice(sales?.avgBasketSize ?? 0, currency)}
          label={t("kpi.avgOrderValue")}
        />
        <StatCard
          value={formatPrice(dashboard?.avgDailyRevenue ?? 0, currency)}
          label={t("kpi.avgDailyRevenue")}
        />
        <StatCard
          value={formatCount(sales?.totalOrders ?? 0, locale as Locale)}
          label={t("kpi.totalSales")}
        />
        <StatCard
          value={formatPrice(payouts?.availableBalance ?? 0, currency)}
          label={t("kpi.pendingPayout")}
          badge={
            payouts?.transactionCount
              ? t("kpi.payoutOrders", { count: payouts.transactionCount })
              : null
          }
          tone="alert"
        />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getVendorSales } from "@/lib/api/endpoints/vendor";
import { formatCount, formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { StatCard } from "@/features/vendor/components/stat-card";
import { RevenueChart } from "@/features/vendor/components/revenue-chart";
import { PeriodPicker } from "@/features/vendor/components/period-picker";
import { rangeWindow, resolveRange } from "@/features/vendor/range";

/**
 * Sales Analytics — `651:14388` light / `651:11752` dark.
 *
 * Round 9 added `unitsSold` and `conversionRate` (GAP-113), and
 * `avgDailyRevenue` on the dashboard — computed server-side, so the client
 * still never divides money.
 *
 * **Refund Rate stays cut**, and so do the frame's two lower panels — Abandoned
 * Carts (with "Send Reminder Emails") and Payment Method Breakdown. The backend
 * confirmed those need analytics infrastructure they do not have, so they are
 * cuts rather than pending work (plans/09 C74).
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function VendorSalesAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const range = resolveRange((await searchParams).range);
  const t = await getTranslations("Vendor.analytics");
  const activeLocale = (await getLocale()) as Locale;
  const sales = await getVendorSales(rangeWindow(range)).catch(() => null);
  const currency = sales?.currency ?? "SAR";

  const labels = {
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
  };

  return (
    <>
      {/* SH — 651:14439 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
            {t("sales.title")}
          </h1>
          {sales?.startDate && sales?.endDate && (
            <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
              {formatDate(sales.startDate, activeLocale)} –{" "}
              {formatDate(sales.endDate, activeLocale)}
            </p>
          )}
        </div>
        <PeriodPicker
          basePath="/vendor/analytics/sales"
          active={range}
          labels={labels}
        />
      </div>

      {/* R7A — 651:14450 */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatPrice(sales?.totalSales ?? 0, currency)}
          label={t("sales.totalSales")}
        />
        <StatCard
          value={formatCount(sales?.totalOrders ?? 0, activeLocale)}
          label={t("sales.totalOrders")}
        />
        <StatCard
          value={formatPrice(sales?.avgBasketSize ?? 0, currency)}
          label={t("sales.avgOrderValue")}
        />
        <StatCard
          value={formatCount(sales?.unitsSold ?? 0, activeLocale)}
          label={t("sales.unitsSold")}
        />
        {sales?.conversionRate != null && (
          <StatCard
            value={`${(sales.conversionRate * 100).toFixed(2)}%`}
            label={t("sales.conversionRate")}
          />
        )}
      </div>

      {/* Chart — 651:14476 */}
      <RevenueChart
        points={sales?.chartData ?? []}
        range={range}
        title={t("sales.revenueTrend")}
        rangeLabels={labels}
        basePath="/vendor/analytics/sales"
        tall
      />
    </>
  );
}

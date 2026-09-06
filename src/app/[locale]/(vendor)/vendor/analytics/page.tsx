import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getVendorSales } from "@/lib/api/endpoints/vendor";
import { formatDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { StatCard } from "@/features/vendor/components/stat-card";
import { RevenueChart } from "@/features/vendor/components/revenue-chart";
import { PeriodPicker } from "@/features/vendor/components/period-picker";
import { rangeWindow, resolveRange } from "@/features/vendor/range";

/**
 * Analytics Hub — `651:14236` light / `651:11600` dark.
 *
 * Round 9 filled in three of the frame's four KPIs: **Conversion Rate** and
 * **Units Sold** are real now, and Avg Order Value always was (GAP-113).
 * **Return Rate** stays cut — the backend confirmed it is not tracked.
 *
 * Both bottom panels — Drop Analysis and Sales by Category — are also confirmed
 * cuts: they need analytics infrastructure that does not exist. See plans/09
 * C74; they should come out of the design rather than wait.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function VendorAnalyticsPage({
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
  const sales = await getVendorSales(rangeWindow(range)).catch(() => null);
  const currency = sales?.currency ?? "SAR";

  const labels = {
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
  };

  return (
    <>
      {/* SH — 651:14287 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
            {t("hub.title")}
          </h1>
          {sales?.startDate && sales?.endDate && (
            <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
              {formatDate(sales.startDate, locale as Locale)} –{" "}
              {formatDate(sales.endDate, locale as Locale)}
            </p>
          )}
        </div>
        <PeriodPicker
          basePath="/vendor/analytics"
          active={range}
          labels={labels}
        />
      </div>

      {/* R6A — 651:14298 */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatPrice(sales?.avgBasketSize ?? 0, currency)}
          label={t("sales.avgOrderValue")}
        />
        {sales?.conversionRate != null && (
          <StatCard
            value={`${(sales.conversionRate * 100).toFixed(2)}%`}
            label={t("sales.conversionRate")}
          />
        )}
        <StatCard
          value={String(sales?.unitsSold ?? 0)}
          label={t("sales.unitsSold")}
        />
      </div>

      {/* Chart — 651:14323 */}
      <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3.5 border p-4">
        <h2 className="text-ink-900 text-[14px] font-semibold">
          {t("hub.revenueOverview")}
        </h2>
        <RevenueChart
          points={sales?.chartData ?? []}
          range={range}
          title={t("hub.revenueChart")}
          rangeLabels={labels}
          basePath="/vendor/analytics"
          tall
        />
      </section>
    </>
  );
}

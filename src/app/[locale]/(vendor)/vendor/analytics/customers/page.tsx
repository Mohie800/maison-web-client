import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  getVendorDemographics,
  getVendorInsights,
} from "@/lib/api/endpoints/vendor";
import { formatCount } from "@/lib/format/money";
import { StatCard } from "@/features/vendor/components/stat-card";
import { ShareBars } from "@/features/vendor/components/share-bars";
import { VisitsChart } from "@/features/vendor/components/visits-chart";
import { PeriodPicker } from "@/features/vendor/components/period-picker";
import { rangeWindow, resolveRange } from "@/features/vendor/range";

/**
 * Customer Insights — `651:14527` light / `651:11927` dark. The best-backed of
 * the four analytics screens: all four KPIs, the new-vs-returning split and the
 * city breakdown are real.
 *
 * Round 9 populated `insights.chartData` — one point per day, zero-filled, the
 * same shape as the sales chart (GAP-107) — so the frame's second chart is real.
 * It plots **visits**, which is what the data is; the frame calls it "Peak
 * Purchase Hours", and hours are not what the API returns (plans/09 C76).
 *
 * The city and country panels honour the date window now too (GAP-108).
 *
 * `avgTimeOnPage` is still 0 and its tile stays cut: the backend confirmed
 * session duration is not tracked rather than inventing a figure.
 */
export const metadata: Metadata = { robots: { index: false } };

/** `percentage` is the server's; only the New share is derived, from its pair. */
function splitPercent(returningRate: number | null | undefined) {
  if (returningRate === null || returningRate === undefined) return null;
  const returning = Math.round(returningRate);
  return { returning, fresh: Math.max(0, 100 - returning) };
}

export default async function VendorCustomerInsightsPage({
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
  const window = rangeWindow(range);

  const [insights, demographics] = await Promise.all([
    getVendorInsights(window).catch(() => null),
    getVendorDemographics(window).catch(() => null),
  ]);

  const delta = (v: number | null | undefined) =>
    v === null || v === undefined ? null : `${v > 0 ? "+" : ""}${Math.round(v)}%`;

  const unique = insights?.uniqueCustomers ?? 0;
  const returning = insights?.returningCustomers ?? 0;
  /* Counts, not money — safe to difference. */
  const fresh = Math.max(0, unique - returning);
  const split = splitPercent(insights?.returningRate);

  const labels = {
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
  };

  return (
    <>
      {/* SH — 651:14578 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
          {t("customers.title")}
        </h1>
        <PeriodPicker
          basePath="/vendor/analytics/customers"
          active={range}
          labels={labels}
        />
      </div>

      {/* R8A — 651:14588 */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatCount(unique, activeLocale)}
          label={t("customers.totalCustomers")}
          badge={delta(insights?.uniqueCustomersChange)}
        />
        <StatCard
          value={formatCount(insights?.totalVisits ?? 0, activeLocale)}
          label={t("customers.newVisitors")}
          badge={delta(insights?.visitsChange)}
        />
        <StatCard
          value={formatCount(returning, activeLocale)}
          label={t("customers.returningBuyers")}
        />
        <StatCard
          value={`${Math.round(insights?.returningRate ?? 0)}%`}
          label={t("customers.returnRate")}
        />
      </div>

      {/* NRC — 651:14614 */}
      <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4 xl:w-[558px]">
        <h2 className="text-ink-900 text-[14px] font-semibold">
          {t("customers.newVsReturning")}
        </h2>
        <div className="flex gap-3">
          <div className="bg-vp-action rounded-10 flex flex-1 flex-col items-center justify-center gap-1 py-3.5">
            <p className="text-action dark:text-aqua text-[24px] font-bold" dir="ltr">
              {formatCount(fresh, activeLocale)}
            </p>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("customers.new")}
            </p>
          </div>
          <div className="bg-vp-info rounded-10 flex flex-1 flex-col items-center justify-center gap-1 py-3.5">
            <p className="text-info text-[24px] font-bold" dir="ltr">
              {formatCount(returning, activeLocale)}
            </p>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("customers.returning")}
            </p>
          </div>
        </div>
        {split && (
          <div className="flex flex-col gap-3">
            <ShareRow
              label={t("customers.new")}
              percent={split.fresh}
              tone="action"
            />
            <ShareRow
              label={t("customers.returning")}
              percent={split.returning}
              tone="info"
            />
          </div>
        )}
      </section>

      {/* Chart — 651:14635, on real data since GAP-107. */}
      {(insights?.chartData ?? []).length > 0 && (
        <VisitsChart
          points={insights?.chartData ?? []}
          title={t("customers.visitsChart")}
        />
      )}

      {/* Loc — 651:14652, plus the country split the same payload carries. */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <ShareBars
          title={t("customers.byCity")}
          empty={t("customers.noSplit")}
          rows={(demographics?.byCity ?? []).map((row) => ({
            label: row.city ?? "—",
            percent: Math.round(row.percentage ?? 0),
          }))}
        />
        <ShareBars
          title={t("customers.byCountry")}
          empty={t("customers.noSplit")}
          rows={(demographics?.byCountry ?? []).map((row) => ({
            label: row.country ?? "—",
            percent: Math.round(row.percentage ?? 0),
          }))}
        />
      </div>
    </>
  );
}

function ShareRow({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: "action" | "info";
}) {
  const text = tone === "action" ? "text-action dark:text-aqua" : "text-info";
  const fill = tone === "action" ? "bg-action dark:bg-aqua" : "bg-info";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between text-[12px]">
        <span className="text-ink-900">{label}</span>
        <span className={`font-bold ${text}`} dir="ltr">
          {percent}%
        </span>
      </div>
      <div className="bg-fill-100 h-2 overflow-hidden rounded-[4px]">
        <div className={`h-2 rounded-[4px] ${fill}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

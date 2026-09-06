import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getVendorTopProducts } from "@/lib/api/endpoints/vendor";
import {
  TOP_PRODUCT_SORTS,
  type TopProductSort,
} from "@/lib/api/schemas/vendor";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount, formatPrice } from "@/lib/format/money";
import { PeriodPicker } from "@/features/vendor/components/period-picker";
import { rangeWindow, resolveRange } from "@/features/vendor/range";

/**
 * Top Products — `651:14684` light / `651:12084` dark.
 *
 * Round 9 added both halves this screen was missing (GAP-113): `?sort=` now
 * accepts `revenue | units_sold | price_asc | price_desc`, so the frame's metric
 * strip is real, and every row carries its `category`.
 *
 * **Views are still a join** from `/listings/me` — `top-products` has no view
 * count — and the frame's fourth tab, Conv. Rate, has no per-product source, so
 * the strip offers the three sorts that exist (plans/09 C75).
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function VendorTopProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; sort?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { range: rawRange, sort: rawSort } = await searchParams;
  const range = resolveRange(rawRange);
  const sort: TopProductSort = (TOP_PRODUCT_SORTS as readonly string[]).includes(
    rawSort ?? "",
  )
    ? (rawSort as TopProductSort)
    : "revenue";
  const t = await getTranslations("Vendor.analytics");
  const activeLocale = (await getLocale()) as Locale;

  const [top, mine] = await Promise.all([
    getVendorTopProducts({ ...rangeWindow(range), sort }).catch(() => null),
    getMyListings({ filter: "all" }).catch(() => null),
  ]);

  const views = new Map(
    (mine?.items ?? []).map((l) => [l.id, l.viewCount ?? 0]),
  );
  const rows = top?.items ?? [];

  const labels = {
    "7d": t("range.7d"),
    "30d": t("range.30d"),
    "90d": t("range.90d"),
  };

  return (
    <>
      {/* SH — 651:14735 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
          {t("top.title")}
        </h1>
        <PeriodPicker
          basePath="/vendor/analytics/top-products"
          active={range}
          labels={labels}
        />
      </div>

      {/* MetTabs — 651:14745. Three sorts, because three is what exists. */}
      <div className="bg-base dark:bg-tint border-line-200 rounded-10 flex h-12 items-center overflow-x-auto border ps-2">
        {TOP_PRODUCT_SORTS.filter((s) => s !== "price_desc").map((key) => (
          <Link
            key={key}
            href={`/vendor/analytics/top-products?range=${range}&sort=${key}`}
            aria-current={key === sort ? "page" : undefined}
            className={`flex h-12 shrink-0 items-center px-4 text-[13px] ${
              key === sort
                ? "text-ink-900 font-semibold"
                : "text-ink-500 dark:text-ink-450"
            }`}
          >
            {t(`top.sorts.${key}`)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-12 border px-4 py-8 text-center text-[13px]">
          {t("top.empty")}
        </p>
      ) : (
        rows.map((product, index) => (
          /* TPR — 651:14754 */
          <div
            key={product.id}
            className="bg-base dark:bg-tint border-line-200 rounded-12 flex items-center gap-4 border px-4 py-3.5"
          >
            {/* Rank — #1 takes the amber tint, the rest a plain fill. */}
            <span
              dir="ltr"
              className={`flex size-8 shrink-0 items-center justify-center rounded-[16px] text-[12px] font-bold ${
                index === 0
                  ? "bg-vp-warn text-amber-deep"
                  : "bg-fill-100 text-ink-500 dark:text-ink-450"
              }`}
            >
              #{index + 1}
            </span>

            <span className="bg-fill-100 rounded-8 size-11 shrink-0 overflow-hidden">
              {resolveMediaUrl(product.coverPhoto) && (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={resolveMediaUrl(product.coverPhoto) ?? ""}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              )}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Link
                href={`/products/${product.id}`}
                className="text-ink-900 truncate text-[14px] font-semibold"
                dir="auto"
              >
                {product.title}
              </Link>
              {product.category?.name && (
                <p
                  className="text-ink-500 dark:text-ink-450 truncate text-[11px]"
                  dir="auto"
                >
                  {product.category.name}
                </p>
              )}
            </div>

            <Metric
              value={formatPrice(product.revenue, "SAR")}
              label={t("top.revenue")}
            />
            <Metric
              value={formatCount(product.soldCount ?? 0, activeLocale)}
              label={t("top.units")}
            />
            <Metric
              value={formatCount(views.get(product.id) ?? 0, activeLocale)}
              label={t("top.views")}
            />
          </div>
        ))
      )}
    </>
  );
}

/** C — 651:14761. Value over a 9px caption. */
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-[2px]">
      <p className="text-ink-900 text-[13px] font-bold">{value}</p>
      <p className="text-ink-500 dark:text-ink-450 text-[9px]">{label}</p>
    </div>
  );
}

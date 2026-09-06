import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getVendorDiscountStats,
  getVendorDiscounts,
} from "@/lib/api/endpoints/vendor";
import { discountStatus } from "@/lib/api/schemas/vendor";
import { formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { deleteDiscountAction } from "@/features/vendor/actions";

/**
 * Discounts & Promotions — `651:15771` light / `651:13189` dark.
 *
 * Round 9 fixed the list (GAP-104): scheduled discounts come back, and `?tab=`
 * filters server-side against the same buckets `/discounts/stats` counts. The
 * bucket is still derived per row for the pill, since the row itself carries no
 * status field.
 *
 * **Per-discount savings are still not returned** — only the aggregate
 * `stats.customerSavings` — so the frame's per-row Saved column shows a dash
 * (plans/09 C78).
 */
export const metadata: Metadata = { robots: { index: false } };

const TABS = ["all", "active", "scheduled", "expired"] as const;
type Tab = (typeof TABS)[number];

const TONE: Record<string, string> = {
  active: "bg-vp-action text-action dark:text-aqua",
  scheduled: "bg-vp-warn text-amber-deep",
  expired: "bg-fill-100 text-ink-500 dark:text-ink-450",
  inactive: "bg-fill-100 text-ink-500 dark:text-ink-450",
};

const CODE_TONE: Record<string, string> = {
  active: "text-action dark:text-aqua",
  scheduled: "text-amber-deep",
  expired: "text-ink-500 dark:text-ink-450",
  inactive: "text-ink-500 dark:text-ink-450",
};

export default async function VendorDiscountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rawTab = (await searchParams).tab;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "all";

  const t = await getTranslations("Vendor.discounts");
  const activeLocale = (await getLocale()) as Locale;

  const [list, stats] = await Promise.all([
    getVendorDiscounts({ limit: 100, tab }).catch(() => null),
    getVendorDiscountStats().catch(() => null),
  ]);

  /* The server filters; the bucket is still derived for the row's own pill. */
  const rows = (list?.items ?? []).map((d) => ({
    ...d,
    bucket: discountStatus(d),
  }));

  return (
    <>
      {/* TB — 651:15822 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
            {t("title")}
          </h1>
          <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
            {t("subtitle", {
              active: stats?.activeCount ?? 0,
              saved: formatPrice(
                stats?.customerSavings ?? 0,
                stats?.currency ?? "SAR",
              ),
            })}
          </p>
        </div>
        <Link
          href="/vendor/discounts/new"
          className="bg-action text-base flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold"
        >
          {t("create")}
        </Link>
      </div>

      {/* T17 — 651:15829 */}
      <div className="bg-base dark:bg-tint border-line-200 rounded-10 flex h-12 items-center overflow-x-auto border ps-2">
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/vendor/discounts?tab=${key}`}
            aria-current={key === tab ? "page" : undefined}
            className={`flex h-12 shrink-0 items-center px-4 text-[13px] ${
              key === tab
                ? "text-ink-900 font-semibold"
                : "text-ink-500 dark:text-ink-450"
            }`}
          >
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-12 border px-4 py-8 text-center text-[13px]">
          {t("empty")}
        </p>
      ) : (
        rows.map((discount) => (
          /* DR17 — 651:15838 */
          <div
            key={discount.id}
            className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-wrap items-center gap-4 border px-4 py-3.5"
          >
            <span
              dir="ltr"
              className={`bg-fill-100 rounded-8 flex h-9 shrink-0 items-center px-3 text-[13px] font-bold ${CODE_TONE[discount.bucket]}`}
            >
              {discount.code}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-ink-900 truncate text-[13px]" dir="auto">
                {discount.name}
              </p>
              {(discount.startsAt || discount.expiresAt) && (
                <p className="text-ink-500 dark:text-ink-450 truncate text-[11px]">
                  {formatDate(discount.startsAt, activeLocale) || "—"} –{" "}
                  {formatDate(discount.expiresAt, activeLocale) || "—"}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-[2px]">
              <p className="text-ink-900 text-[13px] font-bold" dir="ltr">
                {discount.usedCount ?? 0}
              </p>
              <p className="text-ink-500 dark:text-ink-450 text-[9px]">
                {t("usesLabel")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-[2px]">
              {/* Only the aggregate saving exists, never a per-row one. */}
              <p className="text-ink-900 text-[13px] font-bold">—</p>
              <p className="text-ink-500 dark:text-ink-450 text-[9px]">
                {t("savedLabel")}
              </p>
            </div>

            <span
              className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[10px] font-bold ${TONE[discount.bucket]}`}
            >
              {t(`statuses.${discount.bucket}`)}
            </span>

            {/* AB — 651:15852 */}
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/vendor/discounts/${discount.id}`}
                className="border-line-200 text-ink-900 rounded-6 flex h-7 items-center border px-2.5 text-[10px] font-medium"
              >
                {t("edit")}
              </Link>
              <form action={deleteDiscountAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={discount.id} />
                <button
                  type="submit"
                  className="border-line-200 text-error rounded-6 flex h-7 items-center border px-2.5 text-[10px] font-medium"
                >
                  {t("delete")}
                </button>
              </form>
            </div>
          </div>
        ))
      )}
    </>
  );
}

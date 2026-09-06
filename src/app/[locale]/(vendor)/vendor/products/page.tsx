import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount, formatPrice } from "@/lib/format/money";
import { deleteListingAction } from "@/features/listings/actions";
import { VendorTabs } from "@/features/vendor/components/vendor-tabs";

/**
 * My Products — `651:13649` light / `651:11010` dark.
 *
 * **Five tabs, not the eight the account screen shows.** The frame draws All /
 * Live / Pending / Sold Out / Drafts, and this is the portal's own design, so it
 * follows it. `expired`, `withdrawn` and `rejected` are therefore reachable here
 * only under All. `/account/listings` shows all eight for the same endpoint —
 * design should reconcile the two (plans/09 C70).
 *
 * **Edit is a draft-only action, as it is on the account screen.** The API
 * rejects edits to anything live, so the frame's Edit on every row would fail on
 * every row it is drawn against. Non-drafts get View instead, in the same button
 * styling; Delete stays draft-only, the one destructive action the API permits.
 */
export const metadata: Metadata = { robots: { index: false } };

const TABS = ["all", "live", "pending", "sold_out", "draft"] as const;
type Tab = (typeof TABS)[number];

/**
 * Keyed on `ListingStatus`, which is longer than the tab list: `sold` and
 * `traded` both sit under Sold Out, `pending_review` and `pending_payment`
 * under Pending. A row shows its own status, not its tab's.
 */
const STATUS_TONE: Record<string, string> = {
  live: "bg-vp-action text-action dark:text-aqua",
  pending: "bg-vp-warn text-amber-deep",
  pending_review: "bg-vp-warn text-amber-deep",
  pending_payment: "bg-vp-warn text-amber-deep",
  expired: "bg-vp-warn text-amber-deep",
  sold_out: "bg-vp-error text-error",
  sold: "bg-vp-error text-error",
  traded: "bg-vp-info text-info",
  rejected: "bg-vp-error text-error",
  draft: "bg-fill-100 text-ink-500 dark:text-ink-450",
  withdrawn: "bg-fill-100 text-ink-500 dark:text-ink-450",
};

/** Frame widths — Product flexes, the rest are the frame's fixed columns. */
const COL = {
  status: "w-[100px]",
  price: "w-[100px]",
  views: "w-[80px]",
  sales: "w-[80px]",
  actions: "w-[120px]",
};

export default async function VendorProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "all";
  const page = Math.max(1, Number(rawPage) || 1);

  const t = await getTranslations("Vendor.products");
  const activeLocale = (await getLocale()) as Locale;

  const listings = await getMyListings({ filter: tab, page }).catch(() => null);
  const counts = listings?.counts ?? {};
  const rows = listings?.items ?? [];

  return (
    <>
      {/* TB — 651:13703 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
            {t("title")}
          </h1>
          <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
            {t("subtitle", {
              live: counts.live ?? 0,
              pending: counts.pending ?? 0,
              soldOut: counts.sold_out ?? 0,
            })}
          </p>
        </div>
        <Link
          href="/sell"
          className="bg-action text-base flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold"
        >
          {t("add")}
        </Link>
      </div>

      {/* Tabs — 651:13709 */}
      <VendorTabs
        active={tab}
        tabs={TABS.map((key) => ({
          key,
          label: t(`tabs.${key}`),
          count: counts[key] ?? 0,
          href: `/vendor/products?tab=${key}`,
        }))}
      />

      {/* TH — 651:13730 */}
      <div className="bg-fill-50 border-line-200 rounded-t-10 flex h-11 items-center border px-4 text-[11px] font-bold">
        <div className="text-ink-500 dark:text-ink-450 min-w-0 flex-1 ps-2">
          {t("columns.product")}
        </div>
        <div className={`text-ink-500 dark:text-ink-450 shrink-0 ps-2 ${COL.status}`}>
          {t("columns.status")}
        </div>
        <div className={`text-ink-500 dark:text-ink-450 shrink-0 ps-2 ${COL.price}`}>
          {t("columns.price")}
        </div>
        <div className={`text-ink-500 dark:text-ink-450 shrink-0 ps-2 ${COL.views}`}>
          {t("columns.views")}
        </div>
        <div className={`text-ink-500 dark:text-ink-450 shrink-0 ps-2 ${COL.sales}`}>
          {t("columns.sales")}
        </div>
        <div className={`text-ink-500 dark:text-ink-450 shrink-0 ps-2 ${COL.actions}`}>
          {t("columns.actions")}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-b-10 border px-4 py-8 text-center text-[13px]">
          {t("empty")}
        </p>
      ) : (
        rows.map((listing) => {
          const cover = resolveMediaUrl(listing.coverPhotoUrl);
          const status = String(listing.status);
          const isDraft = status === "draft";
          return (
            /* PR — 651:13743 */
            <div
              key={listing.id}
              className="bg-base dark:bg-tint border-line-200 flex items-center border px-4 py-3"
            >
              {/* PC — 651:13744 */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5 ps-2">
                <span className="bg-fill-100 rounded-8 size-11 shrink-0 overflow-hidden">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={cover}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </span>
                <Link
                  href={`/products/${listing.id}`}
                  className="text-ink-900 truncate text-[13px] font-medium"
                  dir="auto"
                >
                  {listing.title}
                </Link>
              </div>

              <div className={`shrink-0 ps-2 ${COL.status}`}>
                <span
                  className={`flex h-[22px] w-fit items-center rounded-[11px] px-2 text-[10px] font-bold ${
                    STATUS_TONE[status] ??
                    "bg-fill-100 text-ink-500 dark:text-ink-450"
                  }`}
                >
                  {t(`statuses.${status}`)}
                </span>
              </div>

              <div className={`text-ink-900 shrink-0 ps-2 text-[12px] ${COL.price}`}>
                {formatPrice(listing.price, listing.currency ?? "SAR")}
              </div>
              <div
                className={`text-ink-900 shrink-0 ps-2 text-[12px] ${COL.views}`}
                dir="ltr"
              >
                {formatCount(listing.viewCount ?? 0, activeLocale)}
              </div>
              <div
                className={`text-ink-900 shrink-0 ps-2 text-[12px] ${COL.sales}`}
                dir="ltr"
              >
                {listing.soldCount
                  ? formatCount(listing.soldCount, activeLocale)
                  : t("none")}
              </div>

              {/* AC — 651:13756 */}
              <div className={`flex shrink-0 gap-2 ps-2 ${COL.actions}`}>
                {isDraft ? (
                  <>
                    <Link
                      href={`/sell?draft=${listing.id}`}
                      className="border-line-200 text-ink-900 rounded-6 flex h-7 items-center border px-2.5 text-[10px] font-medium"
                    >
                      {t("edit")}
                    </Link>
                    <form action={deleteListingAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={listing.id} />
                      <button
                        type="submit"
                        className="border-line-200 text-error rounded-6 flex h-7 items-center border px-2.5 text-[10px] font-medium"
                      >
                        {t("delete")}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href={`/products/${listing.id}`}
                    className="border-line-200 text-ink-900 rounded-6 flex h-7 items-center border px-2.5 text-[10px] font-medium"
                  >
                    {t("view")}
                  </Link>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getListing } from "@/lib/api/endpoints/listings";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount, formatPrice } from "@/lib/format/money";
import { withdrawListingAction } from "@/features/vendor/actions";

/**
 * Product detail — `651:14120` light / `651:11484` dark.
 *
 * **The four performance tiles are relabelled.** The frame asks for "Sold Last
 * 7 Days", "Booked", "Listed" and "In Stock"; a listing carries `viewCount`,
 * `likeCount`, `soldCount` and `quantity`, none of them windowed and none of
 * them "booked". The tiles show the four real counters under their real names
 * rather than four invented ones (plans/09 C83).
 *
 * **The views chart is not built** — nothing returns a per-listing view
 * timeseries (GAP-113's family).
 *
 * **"Pause Listing" is "Withdraw Listing".** Withdrawing is the only thing the
 * API offers and it cannot be undone — `submit` accepts drafts only (GAP-117).
 * Calling that a pause would cost a seller their listing.
 */
export const metadata: Metadata = { robots: { index: false } };

const STATUS_TONE: Record<string, string> = {
  live: "bg-vp-action text-action dark:text-aqua",
  pending: "bg-vp-warn text-amber-deep",
  pending_review: "bg-vp-warn text-amber-deep",
  draft: "bg-fill-100 text-ink-500 dark:text-ink-450",
  sold_out: "bg-vp-error text-error",
  sold: "bg-vp-error text-error",
  rejected: "bg-vp-error text-error",
  expired: "bg-vp-warn text-amber-deep",
  withdrawn: "bg-fill-100 text-ink-500 dark:text-ink-450",
};

export default async function VendorProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Vendor.productDetail");
  const tProducts = await getTranslations("Vendor.products");
  const activeLocale = (await getLocale()) as Locale;

  const listing = await getListing(id);
  if (!listing) notFound();

  /* `soldCount` is on the seller's own list shape, not on the detail one. */
  const mine = await getMyListings({ filter: "all" }).catch(() => null);
  const soldCount =
    (mine?.items ?? []).find((l) => l.id === listing.id)?.soldCount ?? 0;

  const photos = (listing.photos ?? []).map((p) => resolveMediaUrl(p.url));
  const status = String(listing.status);
  const size = (listing.attributes as { size?: string } | null)?.size;
  const meta = [
    listing.category?.name,
    listing.condition ? String(listing.condition).replace(/_/g, " ") : null,
    size,
  ]
    .filter(Boolean)
    .join(" · ");

  const isLive = status === "live";

  return (
    <>
      {/* BC5 — 651:14174 */}
      <nav className="flex gap-1.5 pb-2 text-[12px]">
        <Link href="/vendor/products" className="text-action">
          {t("breadcrumb")}
        </Link>
        <span className="text-ink-500 dark:text-ink-450 rtl:rotate-180">&gt;</span>
        <span className="text-ink-500 dark:text-ink-450 truncate" dir="auto">
          {listing.title}
        </span>
      </nav>

      {/* M5 — 651:14178 */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* LC5 — 651:14179 */}
        <div className="flex flex-col gap-3 xl:w-[400px]">
          <span className="bg-fill-100 block aspect-square w-full overflow-hidden rounded-[16px]">
            {photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img src={photos[0]} alt="" className="size-full object-cover" />
            )}
          </span>
          {photos.length > 1 && (
            <div className="flex gap-2">
              {photos.slice(0, 4).map((photo, index) => (
                <span
                  key={photo ?? index}
                  className={`bg-fill-100 rounded-8 h-[60px] flex-1 overflow-hidden ${
                    index === 0 ? "border-action border-[1.5px]" : ""
                  }`}
                >
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={photo}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RC5 — 651:14190 */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-ink-900 text-[24px] font-bold" dir="auto">
                {listing.title}
              </h1>
              {meta && (
                <p className="text-ink-500 dark:text-ink-450 text-[13px] capitalize">
                  {meta}
                </p>
              )}
              <p className="text-action dark:text-aqua text-[28px] font-bold">
                {formatPrice(listing.price, listing.currency ?? "SAR")}
              </p>
            </div>
            <span
              className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[10px] font-bold ${
                STATUS_TONE[status] ?? "bg-fill-100 text-ink-500 dark:text-ink-450"
              }`}
            >
              {tProducts(`statuses.${status}`)}
            </span>
          </div>

          {/* Perf — 651:14198, under the counters that actually exist. */}
          <div className="flex flex-wrap gap-3">
            <Tile
              value={formatCount(listing.viewCount ?? 0, activeLocale)}
              label={t("views")}
              tone="text-action dark:text-aqua"
            />
            <Tile
              value={formatCount(listing.likeCount ?? 0, activeLocale)}
              label={t("likes")}
              tone="text-info"
            />
            <Tile
              value={formatCount(soldCount, activeLocale)}
              label={t("sold")}
              tone="text-amber-deep"
            />
            <Tile
              value={formatCount(listing.quantity ?? 0, activeLocale)}
              label={t("inStock")}
              tone="text-error"
            />
          </div>

          {/* Desc5 — 651:14228 */}
          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-2 border p-4">
            <h2 className="text-ink-900 text-[13px] font-semibold">
              {t("description")}
            </h2>
            <p className="text-ink-500 dark:text-ink-450 text-[13px]" dir="auto">
              {listing.description || t("noDescription")}
            </p>
          </section>

          {/* AR5 — 651:14231 */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {isLive && (
                <form action={withdrawListingAction} className="flex-1">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={listing.id} />
                  <button
                    type="submit"
                    className="border-error text-error flex h-12 w-full items-center justify-center rounded-[24px] border text-[14px] font-medium"
                  >
                    {t("withdraw")}
                  </button>
                </form>
              )}
              {status === "draft" ? (
                <Link
                  href={`/sell?draft=${listing.id}`}
                  className="bg-action text-base flex h-12 flex-1 items-center justify-center rounded-[24px] text-[14px] font-bold"
                >
                  {t("edit")}
                </Link>
              ) : (
                <Link
                  href={`/products/${listing.id}`}
                  className="bg-action text-base flex h-12 flex-1 items-center justify-center rounded-[24px] text-[14px] font-bold"
                >
                  {tProducts("view")}
                </Link>
              )}
            </div>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {isLive ? t("withdrawNote") : t("editDrafts")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/** SC5 — 651:14199 */
function Tile({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="bg-vp-panel border-line-200 rounded-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border py-3.5">
      <p className={`text-[20px] font-bold ${tone}`} dir="ltr">
        {value}
      </p>
      <p className="text-ink-500 dark:text-ink-450 text-[10px]">{label}</p>
    </div>
  );
}

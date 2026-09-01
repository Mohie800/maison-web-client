import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getTopStoresWeek,
  getTrendingSearches,
} from "@/lib/api/endpoints/discovery";
import { getListings } from "@/lib/api/endpoints/listings";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, formatCount, discountPercent } from "@/lib/format/money";
import type { Locale } from "@/i18n/routing";

/**
 * Trend Hub — Figma `651:1784` (Web_TrendHub).
 *
 * Two of the frame's three sections have data behind them: Top Stores runs on
 * `/trends/top-stores` (rank, sales, preview thumbnails and the week window all
 * come from the response), and Hot Deals on `sort=discount_desc`, which orders
 * by the real saving since GAP-33.
 *
 * Trending Categories runs on `GET /search/trending`, measured from real search
 * events since GAP-54. The frame puts a photo on each card; the response
 * carries a term and a count and nothing else, so the card is the frame's
 * coloured band with no image over it (GAP-93). The design's chip is a growth figure ("+234% searches");
 * it renders when the term has a previous-window baseline, and falls back to
 * the absolute count when it doesn't. A `seed` row — the curated starter list,
 * shown while the current window is still empty — gets no number at all.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Trends" });
  return { title: t("title"), description: t("subtitle") };
}

/** Trending-category bands — Figma `651:1891` and siblings, in order. */
const CATEGORY_BANDS = [
  "bg-gold",
  "bg-aqua",
  "bg-focus",
  "bg-purple",
  "bg-warning",
];

/** Rank accents — Figma `651:1803`, `651:1830`, `651:1858`. */
const RANKS = [
  { badge: "bg-gold text-black", avatar: "bg-action-tint text-action", visit: "border-action text-action" },
  { badge: "bg-line-200 text-ink-700", avatar: "bg-info-tint text-info", visit: "border-info text-info" },
  { badge: "bg-warning text-ink-700", avatar: "bg-warn-tint text-amber-deep", visit: "border-amber-deep text-amber-deep" },
];

export default async function TrendsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Trends");
  /* `categoryType` is the selling track, so it reuses the wizard's names. */
  const tTypes = await getTranslations("Sell");
  const activeLocale = (await getLocale()) as Locale;

  const [stores, deals, trending] = await Promise.all([
    getTopStoresWeek(3),
    getListings({ sort: "discount_desc", limit: 8 }),
    getTrendingSearches().catch(() => []),
  ]);

  const weekFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    { day: "numeric", month: "short" },
  );
  const weekStart = stores.weekStart ? new Date(stores.weekStart) : null;
  const weekEnd = weekStart
    ? new Date(weekStart.getTime() + 6 * 86_400_000)
    : null;

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:1785 */}
      <div className="bg-ink-900">
        <div className="mx-auto flex h-[160px] max-w-[1440px] items-center justify-between gap-6 px-4 lg:px-20">
          <div className="flex flex-col gap-2">
            <span className="bg-ink-800 text-aqua flex h-[26px] w-fit items-center rounded-[13px] px-3 text-[10px] font-medium">
              {t("updatedWeekly")}
            </span>
            <h1 className="text-base text-[32px] font-bold">{t("title")}</h1>
            <p className="text-ink-400 text-[14px]">{t("subtitle")}</p>
          </div>

          {/* WB — 651:1791 */}
          {weekStart && weekEnd && (
            <div className="bg-ink-800 flex shrink-0 flex-col items-center gap-1 rounded-12 px-6 py-4 text-center">
              <p className="text-ink-500 text-[10px] font-bold">
                {t("week", { year: weekStart.getUTCFullYear() })}
              </p>
              <p className="text-aqua text-[18px] font-bold" dir="ltr">
                {weekFmt.format(weekStart)} – {weekFmt.format(weekEnd)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sec — Top Stores This Week — 651:1794 */}
      <section className="bg-base">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-12 lg:px-20">
          <SectionHead
            title={t("topStores")}
            subtitle={t("topStoresSubtitle")}
            actionLabel={t("viewAll")}
            actionHref="/products?sort=popular"
          />

          {stores.items.length === 0 ? (
            <Unavailable message={t("topStoresEmpty")} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {stores.items.map((store, index) => {
                const rank = RANKS[index % RANKS.length];
                const seller = store.seller;
                const name = seller.username ?? seller.fullName ?? "";
                const avatar = resolveMediaUrl(seller.profilePic);
                const initials = name.slice(0, 2).toUpperCase();

                return (
                  <article
                    key={seller.id}
                    className="bg-base border-line-200 flex flex-col gap-4 rounded-16 border p-6"
                  >
                    {/* TR — 651:1802 */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-[28px] items-center rounded-[14px] px-3 text-[12px] font-bold ${rank.badge}`}
                      >
                        #{store.rank ?? index + 1}
                      </span>
                      <span
                        className={`flex size-[52px] items-center justify-center overflow-hidden rounded-full text-[16px] font-bold ${rank.avatar}`}
                      >
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                          <img src={avatar} alt="" className="size-full object-cover" />
                        ) : (
                          initials
                        )}
                      </span>
                    </div>

                    <p className="text-[16px] font-semibold" dir="ltr">
                      @{name}
                    </p>
                    {store.categoryType && (
                      <p className="text-ink-500 text-[12px]">
                        {tTypes.has(`types.${store.categoryType}.name`)
                          ? tTypes(`types.${store.categoryType}.name`)
                          : store.categoryType}
                      </p>
                    )}

                    <span className="bg-fill-100 h-px w-full" aria-hidden />

                    {/* Stats — 651:1810 */}
                    <div className="flex items-start">
                      <Stat
                        value={t("salesThisWeek", { count: store.salesCount ?? 0 })}
                        label={t("thisWeek")}
                      />
                      <Stat
                        value={
                          seller.ratingAvg != null
                            ? t("stars", { rating: Number(seller.ratingAvg).toFixed(1) })
                            : t("noRating")
                        }
                        label={t("rating")}
                      />
                      <Stat
                        value={t("followers", {
                          count: formatCount(store.followersCount ?? 0, activeLocale),
                        })}
                        label={t("followersLabel")}
                      />
                    </div>

                    {/* Thumbs — 651:1820 */}
                    {store.previewListings && store.previewListings.length > 0 && (
                      <div className="flex gap-2">
                        {store.previewListings.slice(0, 3).map((item) => {
                          const photo = resolveMediaUrl(item.coverPhotoUrl);
                          return (
                            <Link
                              key={item.id}
                              href={`/products/${item.id}`}
                              className="bg-fill-100 size-20 overflow-hidden rounded-8"
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
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    <Link
                      href={`/sellers/${seller.id}`}
                      className={`mt-auto flex h-10 items-center justify-center rounded-[20px] border-[1.5px] text-[13px] font-bold ${rank.visit}`}
                    >
                      {t("visitStore")}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sec — Trending Categories — 651:1884 */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-12 lg:px-20">
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-[24px] font-bold">{t("trendingCategories")}</h2>
            <p className="text-ink-500 text-[13px]">
              {t("trendingCategoriesSubtitle")}
            </p>
          </div>
          {trending.length === 0 ? (
            <Unavailable message={t("trendingCategoriesEmpty")} />
          ) : (
            /* CatRow — 651:1889 */
            <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {trending.slice(0, 5).map((row, index) => (
                <Link
                  key={row.term}
                  href={`/products?q=${encodeURIComponent(row.term)}`}
                  className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border"
                >
                  <div className={`h-[120px] ${CATEGORY_BANDS[index % CATEGORY_BANDS.length]}`} />
                  <div className="flex flex-col items-start gap-1.5 p-3">
                    <p className="truncate text-[13px] font-semibold" dir="auto">
                      {row.term}
                    </p>
                    <span className="bg-action-tint text-action flex h-[22px] items-center rounded-[11px] px-2 text-[10px] font-bold">
                      {row.formattedGrowth ??
                        row.formattedCount ??
                        t("searches", { count: row.searchCount ?? 0 })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sec — Hot Deals This Week — 651:1925 */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-12 lg:px-20">
          <SectionHead
            title={t("hotDeals")}
            subtitle={t("hotDealsSubtitle")}
            actionLabel={t("viewAll")}
            actionHref="/products?sort=discount_desc"
          />

          {deals.items.length === 0 ? (
            <Unavailable message={t("hotDealsEmpty")} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {deals.items.map((listing) => {
                const photo = resolveMediaUrl(coverPhotoUrl(listing));
                const percent = discountPercent(
                  listing.originalPrice,
                  listing.price,
                );
                const currency = listing.currency ?? "SAR";

                return (
                  <article
                    key={listing.id}
                    className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border"
                  >
                    {/* Img — 651:1933 */}
                    <div className="bg-fill-100 h-[180px]">
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                        <img
                          src={photo}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Ctn — 651:1935 */}
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <div className="flex items-center gap-2">
                        {percent != null && percent > 0 && (
                          <span className="bg-error-tint text-error flex h-[22px] items-center rounded-[11px] px-1.5 text-[10px] font-bold">
                            −{percent}%
                          </span>
                        )}
                        {listing.category?.name && (
                          <span className="text-ink-500 truncate text-[11px]" dir="auto">
                            {listing.category.name}
                          </span>
                        )}
                      </div>

                      <h3 className="truncate text-[13px] font-semibold" dir="auto">
                        {listing.title}
                      </h3>

                      <div className="flex items-center gap-2" dir="ltr">
                        <span className="text-error text-[15px] font-bold">
                          {formatPrice(listing.price, currency)}
                        </span>
                        {listing.originalPrice && (
                          <span className="text-ink-400 text-[12px] line-through">
                            {formatPrice(listing.originalPrice, currency)}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/products/${listing.id}`}
                        className="bg-aqua mt-auto flex h-[38px] items-center justify-center rounded-10 text-[12px] font-bold text-black"
                      >
                        {t("buyNow")}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** SH — 651:1795: 24px title, 13px subtitle, trailing action. */
function SectionHead({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-bold">{title}</h2>
        <p className="text-ink-500 text-[13px]">{subtitle}</p>
      </div>
      <Link
        href={actionHref}
        className="text-action flex shrink-0 items-center gap-1 text-[13px] font-medium"
      >
        {actionLabel}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </Link>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-[12px] font-bold">{value}</span>
      <span className="text-ink-500 text-[10px]">{label}</span>
    </div>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <p className="border-line-200 text-ink-tertiary rounded-16 border border-dashed p-10 text-center text-[13px]">
      {message}
    </p>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { getListings } from "@/lib/api/endpoints/listings";
import { getAuctionStats } from "@/lib/api/endpoints/auctions";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format/money";
import { AuctionCountdown } from "@/features/auctions/components/auction-countdown";
import type { Locale } from "@/i18n/routing";

/**
 * Live Auctions — Figma `651:6926` (Web_AuctionsPage).
 *
 * The tabs are real filters rather than decoration: the first three are sorts
 * the API accepts (`ending_soon` needs `saleMode=auction`, which this page
 * always sends), and the category tabs are `categoryId`.
 *
 * All of the hero's stats come from `GET /auctions/stats` since GAP-55.
 * "Total Bids Today" reads both ways so the response carries both — a count and
 * a value — and the count is what the design's label means. Each figure states
 * its own window rather than assuming what "today" and "soon" mean here.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Auctions" });
  return { title: t("title"), description: t("subtitle") };
}

type Tab = "all" | "ending_soon" | "just_started";

export default async function AuctionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; categoryId?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Auctions");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;

  const tab: Tab =
    query.tab === "ending_soon" || query.tab === "just_started"
      ? query.tab
      : "all";
  const categoryId = query.categoryId || undefined;

  const [result, categories, stats] = await Promise.all([
    getListings({
      saleMode: "auction",
      status: "live",
      limit: 24,
      sort: tab === "just_started" ? "created_at_desc" : "ending_soon",
      ...(categoryId ? { categoryId } : {}),
    }),
    getCategoryTree(),
    // Decorative next to the grid — a failure shouldn't take the page down.
    getAuctionStats().catch(() => null),
  ]);

  const heroStats = [
    { key: "liveAuctions", value: String(stats?.liveCount ?? result.total) },
    stats?.activeBidders != null
      ? { key: "activeBidders", value: String(stats.activeBidders) }
      : null,
    stats?.bidsToday != null
      ? { key: "bidsToday", value: String(stats.bidsToday) }
      : null,
    stats?.endingSoonCount != null
      ? {
          key: "endingSoonCount",
          value: String(stats.endingSoonCount),
          note:
            stats.endingSoonWithinHours != null
              ? t("endingSoonNote", { hours: stats.endingSoonWithinHours })
              : null,
        }
      : null,
  ].filter((row) => row !== null);

  const href = (next: { tab?: Tab; categoryId?: string }) => {
    const params = new URLSearchParams();
    const merged = { tab, categoryId, ...next };
    if (merged.tab && merged.tab !== "all") params.set("tab", merged.tab);
    if (merged.categoryId) params.set("categoryId", merged.categoryId);
    const q = params.toString();
    return `/auctions${q ? `?${q}` : ""}`;
  };

  const tabs: { key: string; label: string; href: string; active: boolean }[] = [
    {
      key: "all",
      label: t("tabs.all"),
      href: href({ tab: "all", categoryId: "" }),
      active: tab === "all" && !categoryId,
    },
    {
      key: "ending_soon",
      label: t("tabs.endingSoon"),
      href: href({ tab: "ending_soon" }),
      active: tab === "ending_soon",
    },
    {
      key: "just_started",
      label: t("tabs.justStarted"),
      href: href({ tab: "just_started" }),
      active: tab === "just_started",
    },
    ...categories.slice(0, 3).map((category) => ({
      key: category.id,
      label: pickLocalized(category, "name", activeLocale),
      href: href({ categoryId: category.id }),
      active: categoryId === category.id,
    })),
  ];

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:6927 */}
      <div className="bg-ink-900 flex min-h-[200px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <div className="flex items-center gap-3">
          <h1 className="text-base text-[32px] font-bold">{t("title")}</h1>
          <span className="bg-error text-base flex h-[28px] items-center rounded-[14px] px-2.5 text-[11px] font-bold">
            {t("live")}
          </span>
        </div>
        <p className="text-ink-400 text-[16px]">{t("subtitle")}</p>
        <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-4">
          {heroStats.map((stat) => (
            <div key={stat.key} className="flex flex-col items-center gap-0.5">
              <p className="text-aqua text-[20px] font-bold" dir="ltr">
                {stat.value}
              </p>
              <p className="text-ink-500 text-[11px]">{t(stat.key)}</p>
              {"note" in stat && stat.note && (
                <p className="text-ink-500 text-[10px]">{stat.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FB — 651:6943 */}
      <div className="bg-base border-line-200 border-y">
        <div className="mx-auto flex max-w-[1440px] items-start overflow-x-auto px-4 lg:px-20">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex h-[52px] shrink-0 items-center px-5 text-[13px] whitespace-nowrap ${
                item.active
                  ? "text-ink-900 font-semibold"
                  : "text-ink-500 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content — 651:6956 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-16 lg:px-20">
        {/* RH — 651:6957 */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[16px] font-semibold">
            {t("activeCount", { count: result.total })}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-ink-500 text-[12px]">{t("sort")}</span>
            <span className="bg-base border-line-200 flex h-[38px] items-center gap-2 rounded-8 border pe-2.5 ps-3.5 text-[12px] font-medium">
              {tab === "just_started" ? t("tabs.justStarted") : t("endingSoonest")}
            </span>
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="border-line-200 rounded-16 border border-dashed p-14 text-center">
            <p className="text-body-lg mb-2">{t("emptyTitle")}</p>
            <p className="text-body text-ink-secondary">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((listing) => {
              const photo = resolveMediaUrl(coverPhotoUrl(listing));
              const currency = listing.currency ?? "SAR";
              const amount = listing.currentBid ?? listing.startingBid;
              const descriptor = [
                listing.brand?.name,
                listing.condition
                  ? t(`conditions.${listing.condition}`)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <article
                  key={listing.id}
                  className="bg-base border-line-200 flex flex-col overflow-hidden rounded-16 border"
                >
                  {/* Img — 651:6966 */}
                  <Link
                    href={`/products/${listing.id}`}
                    className="bg-fill-100 block h-[220px]"
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

                  {/* Ctn — 651:6968 */}
                  <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                    <h2 className="truncate text-[15px] font-semibold" dir="auto">
                      {listing.title}
                    </h2>
                    {descriptor && (
                      <p className="text-ink-500 truncate text-[11px]" dir="auto">
                        {descriptor}
                      </p>
                    )}

                    {/* BR — 651:6971 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-ink-500 text-[10px] font-medium">
                          {t("currentBid")}
                        </p>
                        <p className="text-[18px] font-bold" dir="ltr">
                          {formatPrice(amount, currency)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <p className="text-ink-500 text-[10px]">
                          {t("bids", { count: listing.bidCount ?? 0 })}
                        </p>
                        {listing.auctionEndsAt && (
                          <span className="bg-error-tint text-error flex h-6 items-center rounded-12 px-2 text-[12px] font-bold">
                            <AuctionCountdown
                              endsAt={listing.auctionEndsAt}
                              endedLabel={t("ended")}
                            />
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/products/${listing.id}`}
                      className="bg-aqua mt-auto flex h-11 items-center justify-center rounded-[22px] text-[13px] font-bold text-black"
                    >
                      {t("placeBid")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

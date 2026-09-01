import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBrandDirectory } from "@/lib/api/endpoints/catalog";
import {
  BRAND_FILTERS,
  BRAND_SORTS,
  type BrandFilter,
  type BrandSort,
} from "@/lib/api/schemas/catalog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatCount } from "@/lib/format/money";
import {
  followBrandAction,
  unfollowBrandAction,
} from "@/features/catalog/brand-actions";
import type { Locale } from "@/i18n/routing";

/**
 * Browse Brands — Figma `651:3086` (Web_BrandsPage).
 *
 * Everything on the card is a field now (GAP-53): the "Official · Fashion"
 * line, the follower count and Follow. Sorting and the eight filter tabs are
 * the server's — `?filter=` and `?sort=` — rather than a client-side re-rank of
 * one list, so "Most Popular" means what the API means by it (live item count).
 *
 * **`isOfficial`, `isTrending` and `isSaudi` are editorial flags.** Nothing
 * computes them, and every brand on dev reads false, so those three tabs are
 * empty until merchandising sets them. That is the true answer, and the tab
 * says so rather than being hidden — see plans/08.
 *
 * No brand carries a `logoUrl` either, so the wordmark still stands in.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Brands" });
  return { title: t("title"), description: t("subtitle") };
}

/** Logo band tints — Figma `651:3111` and siblings, in the frame's order. */
const BANDS = [
  "bg-fill-50",
  "bg-info-tint",
  "bg-warn-tint",
  "bg-action-tint",
  "bg-purple-tint",
  "bg-fill-100",
];

export default async function BrandsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Brands");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;

  const filter: BrandFilter = BRAND_FILTERS.includes(query.filter as BrandFilter)
    ? (query.filter as BrandFilter)
    : "all";
  const sort: BrandSort = BRAND_SORTS.includes(query.sort as BrandSort)
    ? (query.sort as BrandSort)
    : "popular";

  const [brands, viewer] = await Promise.all([
    getBrandDirectory({ filter, sort }),
    getCurrentUser(),
  ]);

  const href = (next: { filter?: BrandFilter; sort?: BrandSort }) => {
    const p = new URLSearchParams();
    const merged = { filter, sort, ...next };
    if (merged.filter !== "all") p.set("filter", merged.filter);
    if (merged.sort !== "popular") p.set("sort", merged.sort);
    const q = p.toString();
    return `/brands${q ? `?${q}` : ""}`;
  };

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:3087 */}
      <div className="bg-ink-900 flex h-[140px] flex-col items-center justify-center gap-2">
        <h1 className="text-base text-[28px] font-bold">{t("title")}</h1>
        <p className="text-ink-400 text-[14px]">{t("subtitle")}</p>
      </div>

      {/* FB — 651:3090 */}
      <div className="bg-base border-line-200 border-y">
        <div className="mx-auto flex max-w-[1440px] items-center overflow-x-auto px-4 lg:px-20">
          {BRAND_FILTERS.map((option) => (
            <Link
              key={option}
              href={href({ filter: option })}
              aria-current={option === filter ? "page" : undefined}
              className={`flex h-[52px] shrink-0 items-center px-[18px] text-[13px] whitespace-nowrap ${
                option === filter
                  ? "text-ink-900 font-semibold"
                  : "text-ink-500 hover:text-ink"
              }`}
            >
              {t(`filters.${option}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* Content — 651:3103 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-16 lg:px-20">
        {/* RH — 651:3104 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[16px] font-semibold">
            {t("brandCount", { count: brands.length })}
          </p>
          {/* Sort — 651:3106 */}
          <details className="relative">
            <summary className="bg-base border-line-200 flex h-[38px] cursor-pointer list-none items-center gap-2 rounded-8 border ps-3.5 pe-2.5">
              <span className="text-ink-900 text-[12px] font-medium">
                {t(`sorts.${sort}`)}
              </span>
              <ChevronDown className="text-ink-500 size-3" aria-hidden />
            </summary>
            <div className="bg-base border-line-200 absolute end-0 z-20 mt-1 flex min-w-full flex-col overflow-hidden rounded-8 border shadow-lg">
              {BRAND_SORTS.map((option) => (
                <Link
                  key={option}
                  href={href({ sort: option })}
                  aria-current={option === sort ? "true" : undefined}
                  className={`px-3.5 py-2 text-[12px] whitespace-nowrap ${
                    option === sort
                      ? "bg-action-tint text-action font-semibold"
                      : "text-ink-700 hover:bg-surface"
                  }`}
                >
                  {t(`sorts.${option}`)}
                </Link>
              ))}
            </div>
          </details>
        </div>

        {brands.length === 0 ? (
          <p className="border-line-200 text-ink-400 rounded-16 border p-10 text-center text-[14px]">
            {t("emptyFilter")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {brands.map((brand, index) => {
              const logo = resolveMediaUrl(brand.logoUrl);
              const name = pickLocalized(brand, "name", activeLocale);
              const following = Boolean(brand.isFollowing);

              /* The frame's "Official · Fashion" line, from real flags. */
              const marks = [
                brand.isOfficial ? t("official") : null,
                brand.isTrending ? t("trending") : null,
                brand.isSaudi ? t("saudi") : null,
                brand.categoryType ? t(`filters.${brand.categoryType}`) : null,
              ].filter(Boolean);

              return (
                <article
                  key={brand.id}
                  className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border"
                >
                  {/* Logo — 651:3111 */}
                  <div
                    className={`flex h-[120px] items-center justify-center ${BANDS[index % BANDS.length]}`}
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={logo}
                        alt=""
                        className="size-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      /* No brand carries a logo yet, so the wordmark stands in. */
                      <span className="text-ink-900 text-[22px] font-bold" dir="auto">
                        {name}
                      </span>
                    )}
                  </div>

                  {/* Ctn — 651:3112 */}
                  <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
                    <h2
                      className="flex items-center gap-1.5 text-[15px] font-semibold"
                      dir="auto"
                    >
                      {name}
                      {brand.isVerified && (
                        <BadgeCheck
                          className="text-action size-3.5 shrink-0"
                          aria-label={t("verified")}
                        />
                      )}
                    </h2>

                    {marks.length > 0 && (
                      <p className="text-ink-500 text-[11px]">{marks.join(" · ")}</p>
                    )}

                    <p className="text-ink-400 text-[11px]">
                      {[
                        brand.followersCount
                          ? t("followers", {
                              count: formatCount(brand.followersCount, activeLocale),
                            })
                          : null,
                        brand.listingCount != null
                          ? t("itemsCount", {
                              count: formatCount(brand.listingCount, activeLocale),
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Link
                        href={`/products?brandId=${brand.id}`}
                        className="border-line-200 text-ink-700 flex h-[34px] flex-1 items-center justify-center rounded-8 border text-[12px] font-medium"
                      >
                        {t("browse")}
                      </Link>

                      {/*
                        Only for a signed-in visitor: `isFollowing` is always
                        false without a token, so the button would misreport
                        state and then 401 on press.
                      */}
                      {viewer && (
                        <form
                          className="flex-1"
                          action={following ? unfollowBrandAction : followBrandAction}
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="brandId" value={brand.id} />
                          <input type="hidden" name="back" value={href({})} />
                          <button
                            type="submit"
                            aria-pressed={following}
                            className={`flex h-[34px] w-full items-center justify-center rounded-8 text-[12px] font-bold ${
                              following
                                ? "border-action bg-action-tint text-action border"
                                : "bg-aqua text-black"
                            }`}
                          >
                            {following ? t("following") : t("follow")}
                          </button>
                        </form>
                      )}
                    </div>
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

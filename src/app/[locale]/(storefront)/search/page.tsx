import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBrands, getCategoryTree, getMaterials } from "@/lib/api/endpoints/catalog";
import { getListingFacets, getListings } from "@/lib/api/endpoints/listings";
import { listingToCard } from "@/lib/api/adapters";
import { pickLocalized } from "@/lib/i18n/localized";
import { ProductCard } from "@/components/commerce/product-card";
import { FilterPanel } from "@/features/catalog/components/filter-panel";
import { Pagination } from "@/features/catalog/components/pagination";
import {
  buildHref,
  PAGE_SIZE,
  parseFilters,
  toListingQuery,
  type PlpFilters,
} from "@/features/catalog/filters";
import type { Locale } from "@/i18n/routing";

/**
 * Search results — Figma `651:2623` (Web_SearchResults).
 *
 * The header's search box has posted here since the chrome was built; the route
 * simply didn't exist, so every search 404'd. A form `action` isn't an `href`,
 * which is why no link audit caught it.
 *
 * Results come from `GET /listings?search=`, not `GET /search`. The combined
 * endpoint returns `{ listings, users, brands }` with no total, no paging and no
 * sort, while the listings endpoint takes the same query alongside every filter
 * this page needs and `GET /listings/facets` counts them. People and brands
 * aren't in this frame, so nothing is lost.
 *
 * Two deviations, both recorded in plans/09 C32:
 *
 * - The frame's sidebar draws four groups (category, condition, price, brand);
 *   we render the PLP's panel, which is the same filter model with more of it.
 *   Two divergent filter implementations over one set of URL parameters would
 *   drift within a sprint.
 * - The "Related:" chips have no source — nothing suggests query variants.
 *   `/search/trending` is popular terms, not terms related to yours.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Catalog" });
  const filters = parseFilters(await props.searchParams);
  return {
    title: filters.search
      ? t("searchResultsFor", { query: filters.search })
      : t("searchTitle"),
    robots: { index: false },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Catalog");
  const tListing = await getTranslations("Listing");
  const activeLocale = (await getLocale()) as Locale;
  const filters = parseFilters(await searchParams);

  const [result, categories, rawBrands, facets, materials] = await Promise.all([
    getListings(toListingQuery(filters)),
    getCategoryTree(),
    getBrands(),
    getListingFacets(toListingQuery(filters)).catch(() => null),
    getMaterials().catch(() => []),
  ]);

  const brands = rawBrands.map((brand) => ({
    id: brand.id,
    name: pickLocalized(brand, "name", activeLocale) || brand.name,
  }));

  const href = (patch: Partial<PlpFilters>) => buildHref(filters, patch, "/search");

  /** AF — 651:2715. Every filter that's on, each removable on its own. */
  const active: { key: string; label: string; patch: Partial<PlpFilters>; tone: string }[] = [];
  if (filters.condition) {
    active.push({
      key: "condition",
      label: t("chipCondition", {
        value: tListing(`conditions.${filters.condition}`),
      }),
      patch: { condition: undefined },
      tone: "bg-action-tint text-action",
    });
  }
  if (filters.brandId) {
    const brand = brands.find((b) => b.id === filters.brandId);
    if (brand) {
      active.push({
        key: "brand",
        label: t("chipBrand", { value: brand.name }),
        patch: { brandId: undefined },
        tone: "bg-purple-tint text-purple-text",
      });
    }
  }
  if (filters.categoryId) {
    const category = categories.find((c) => c.id === filters.categoryId);
    if (category) {
      active.push({
        key: "category",
        label: t("chipCategory", {
          value: pickLocalized(category, "name", activeLocale),
        }),
        patch: { categoryId: undefined },
        tone: "bg-info-tint text-info",
      });
    }
  }

  return (
    <div className="bg-surface flex flex-col">
      {/* SS — 651:2624 */}
      <div className="bg-base border-line border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 lg:px-20">
          {/* BS — 651:2625 */}
          <form
            action="/search"
            className="bg-fill-50 border-aqua flex h-14 items-center gap-3.5 rounded-[28px] border-2 px-5"
          >
            <label
              htmlFor="q"
              className="text-ink-400 shrink-0 text-[16px] font-bold"
            >
              {t("searchLabel")}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.search ?? ""}
              placeholder={t("searchPlaceholder")}
              className="text-ink-900 min-w-0 flex-1 bg-transparent text-[18px] outline-none"
              dir="auto"
            />
            {filters.search && (
              <Link
                href="/search"
                aria-label={t("clearSearch")}
                className="bg-fill-100 text-ink-500 flex size-8 shrink-0 items-center justify-center rounded-16"
              >
                <X className="size-3" aria-hidden />
              </Link>
            )}
            <button
              type="submit"
              aria-label={t("searchLabel")}
              className="bg-aqua flex size-10 shrink-0 items-center justify-center rounded-20 text-black"
            >
              <Search className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      </div>

      {/* Main — 651:2644 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-16 lg:flex-row lg:items-start lg:px-20">
        <FilterPanel
          filters={filters}
          categories={categories}
          brands={brands}
          facets={facets}
          materials={materials}
          basePath="/search"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* RH — 651:2708 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-[20px] font-bold" dir="auto">
                {filters.search
                  ? t("searchResultsFor", { query: filters.search })
                  : t("searchTitle")}
              </h1>
              <p className="text-ink-500 text-[13px]">
                {t("resultsFound", { count: result.total })}
              </p>
            </div>
          </div>

          {/* AF — 651:2715 */}
          {active.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {active.map((chip) => (
                <Link
                  key={chip.key}
                  href={href({ ...chip.patch, page: 1 })}
                  className={`flex h-7 items-center gap-1.5 rounded-[14px] px-2.5 text-[11px] font-medium ${chip.tone}`}
                >
                  {chip.label}
                  <X className="size-2.5" aria-hidden />
                </Link>
              ))}
              <Link
                href={filters.search ? `/search?q=${encodeURIComponent(filters.search)}` : "/search"}
                className="text-error text-[12px] font-medium"
              >
                {t("clearAll")}
              </Link>
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="border-line rounded-16 border border-dashed p-14 text-center">
              <p className="text-body-lg mb-2">{t("emptyTitle")}</p>
              <p className="text-body text-ink-secondary">{t("emptyBody")}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((listing) => (
                  <ProductCard key={listing.id} card={listingToCard(listing)} />
                ))}
              </div>

              <Pagination
                page={filters.page}
                total={result.total}
                pageSize={PAGE_SIZE}
                buildHref={(next) => href({ page: next })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

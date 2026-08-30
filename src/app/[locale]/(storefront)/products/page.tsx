import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import {
  getBrands,
  getCategoryTree,
  getMaterials,
} from "@/lib/api/endpoints/catalog";
import { getListingFacets, getListings } from "@/lib/api/endpoints/listings";
import { listingToCard } from "@/lib/api/adapters";
import { pickLocalized } from "@/lib/i18n/localized";
import { ProductCard } from "@/components/commerce/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FilterPanel } from "@/features/catalog/components/filter-panel";
import { PlpToolbar } from "@/features/catalog/components/plp-toolbar";
import { Pagination } from "@/features/catalog/components/pagination";
import {
  buildHref,
  PAGE_SIZE,
  parseFilters,
  toListingQuery,
} from "@/features/catalog/filters";
import type { Locale } from "@/i18n/routing";

/**
 * Product listing page — Figma node 651:3930 (Web_PLP).
 *
 * Dynamic rather than static: results depend on the query string, and the
 * filter combinations are unbounded. Each underlying fetch still carries its
 * own cache tags, so repeated filter states are cheap.
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
      : t("allItems"),
    // Filtered permutations shouldn't compete with the canonical listing page.
    robots: filters.page > 1 || filters.brandId ? { index: false } : undefined,
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Catalog");
  const activeLocale = (await getLocale()) as Locale;
  const filters = parseFilters(await searchParams);

  const [result, categories, rawBrands, facets, materials] = await Promise.all([
    getListings(toListingQuery(filters)),
    getCategoryTree(),
    getBrands(),
    // Non-fatal: the sidebar renders without counts rather than failing the page.
    getListingFacets(toListingQuery(filters)).catch(() => null),
    getMaterials().catch(() => []),
  ]);

  const brands = rawBrands.map((brand) => ({
    id: brand.id,
    name: pickLocalized(brand, "name", activeLocale) || brand.name,
  }));

  const category = categories.find((c) => c.id === filters.categoryId);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <Breadcrumbs
        items={[
          { label: t("home"), href: "/" },
          ...(category
            ? [{ label: pickLocalized(category, "name", activeLocale) }]
            : [{ label: t("allItems") }]),
        ]}
      />

      <div className="mt-6 flex flex-col gap-10 lg:flex-row">
        <FilterPanel
          filters={filters}
          categories={categories}
          brands={brands}
          facets={facets}
          materials={materials}
        />

        <div className="min-w-0 flex-1">
          <PlpToolbar
            filters={filters}
            total={result.total}
            categories={categories}
            brands={brands}
          />

          {result.items.length === 0 ? (
            <div className="border-line rounded-16 border border-dashed p-14 text-center">
              <p className="text-body-lg mb-2">{t("emptyTitle")}</p>
              <p className="text-body text-ink-secondary">{t("emptyBody")}</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((listing, i) => (
                <ProductCard
                  key={listing.id}
                  card={listingToCard(listing)}
                  priority={i < 6}
                />
              ))}
            </div>
          )}

          <Pagination
            page={filters.page}
            total={result.total}
            pageSize={PAGE_SIZE}
            buildHref={(page) => buildHref(filters, { page })}
          />
        </div>
      </div>
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import {
  buildHref,
  hasActiveFilters,
  SORT_OPTIONS,
  type PlpFilters,
} from "../filters";
import type { Category } from "@/lib/api/schemas/catalog";
import type { Locale } from "@/i18n/routing";

/** Active-filter chips and the sort control, above the results grid. */
export async function PlpToolbar({
  filters,
  total,
  categories,
  brands,
}: {
  filters: PlpFilters;
  total: number;
  categories: Category[];
  brands: { id: string; name: string }[];
}) {
  const t = await getTranslations("Catalog");
  const tListing = await getTranslations("Listing");
  const locale = (await getLocale()) as Locale;

  const category = categories.find((c) => c.id === filters.categoryId);
  const brand = brands.find((b) => b.id === filters.brandId);

  const chips: { label: string; href: string; isolate?: boolean }[] = [];
  if (category) {
    chips.push({
      label: `${t("category")}: ${pickLocalized(category, "name", locale)}`,
      href: buildHref(filters, { categoryId: undefined }),
    });
  }
  if (brand) {
    chips.push({
      label: `${t("brand")}: ${brand.name}`,
      href: buildHref(filters, { brandId: undefined }),
    });
  }
  if (filters.condition) {
    chips.push({
      label: `${t("condition")}: ${tListing(`conditions.${filters.condition}`)}`,
      href: buildHref(filters, { condition: undefined }),
    });
  }
  if (filters.search) {
    chips.push({
      label: `${t("search")}: ${filters.search}`,
      href: buildHref(filters, { search: undefined }),
    });
  }
  if (filters.saleMode) {
    chips.push({
      label: `${t("saleType")}: ${t(`saleModes.${filters.saleMode}`)}`,
      href: buildHref(filters, { saleMode: undefined }),
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    /**
     * "SAR 100+" / "up to SAR 500" / "SAR 100 – SAR 500" rather than an ∞ symbol,
     * and the numeric run is isolated LTR: a mixed Latin-digit range inside an
     * Arabic label gets reordered by the bidi algorithm otherwise.
     */
    const range =
      filters.minPrice && filters.maxPrice
        ? t("priceBetween", { min: filters.minPrice, max: filters.maxPrice })
        : filters.minPrice
          ? t("priceFrom", { min: filters.minPrice })
          : t("priceUpTo", { max: filters.maxPrice! });

    chips.push({
      label: `${t("priceRange")}: ${range}`,
      href: buildHref(filters, { minPrice: undefined, maxPrice: undefined }),
      isolate: true,
    });
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-h1">
            {category ? pickLocalized(category, "name", locale) : t("allItems")}
          </h1>
          <span className="bg-tint text-caption text-ink-secondary rounded-[12px] px-3 py-1">
            {t("itemCount", { count: total })}
          </span>
        </div>

        {/*
          Sort is a list of links rather than a <select>, so it works without
          JavaScript and each sort order is its own URL.
        */}
        <div className="flex items-center gap-2">
          <span className="text-caption text-ink-tertiary">{t("sort")}</span>
          <div className="border-line flex overflow-hidden rounded-[18px] border">
            {SORT_OPTIONS.map((option) => {
              const active = filters.sort === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildHref(filters, { sort: option.value })}
                  aria-current={active ? "true" : undefined}
                  className={`text-caption px-3 py-2 ${
                    active
                      ? "bg-action-tint text-action font-semibold"
                      : "text-ink-secondary"
                  }`}
                >
                  {t(`sortOptions.${option.labelKey}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="bg-tint text-caption text-ink-secondary flex items-center gap-1.5 rounded-[14px] px-3 py-1.5"
            >
              <bdi>{chip.label}</bdi>
              <X className="size-3" aria-hidden />
            </Link>
          ))}

          {hasActiveFilters(filters) && (
            <Link href="/products" className="text-caption text-error ms-1">
              {t("clearAll")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

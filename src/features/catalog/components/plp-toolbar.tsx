import { getTranslations, getLocale } from "next-intl/server";
import { ChevronDown, X } from "lucide-react";
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

/**
 * The PLP title row and active-filter chips — `TR` (`651:4030`) and `AF`
 * (`651:4038`) on Web_PLP.
 *
 * The frame colour-codes a chip by which filter it clears: condition green,
 * price blue, brand purple. The other filter types have no chip drawn, so they
 * take the remaining tints from the same palette rather than a neutral that
 * would read as a different kind of control (plans/09 C51).
 *
 * Sort is a native `<details>`, styled as the frame's single dropdown button.
 * A `<select>` would need JavaScript to navigate, and the row of links this
 * replaced did not match the design; `<details>` is the pattern the FAQ and the
 * filter panel already use.
 */
const CHIP_TONE: Record<string, string> = {
  condition: "bg-action-tint text-action",
  price: "bg-info-tint text-info",
  brand: "bg-purple-tint text-purple-text",
  category: "bg-warn-tint text-amber-deep",
  discount: "bg-error-tint text-error",
  search: "bg-fill-100 text-ink-700",
  saleMode: "bg-info-tint2 text-info",
};
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

  const chips: {
    label: string;
    href: string;
    tone: string;
    isolate?: boolean;
  }[] = [];
  if (category) {
    chips.push({
      tone: "category",
      label: `${t("category")}: ${pickLocalized(category, "name", locale)}`,
      href: buildHref(filters, { categoryId: undefined }),
    });
  }
  if (brand) {
    chips.push({
      tone: "brand",
      label: `${t("brand")}: ${brand.name}`,
      href: buildHref(filters, { brandId: undefined }),
    });
  }
  if (filters.condition) {
    chips.push({
      tone: "condition",
      label: `${t("condition")}: ${tListing(`conditions.${filters.condition}`)}`,
      href: buildHref(filters, { condition: undefined }),
    });
  }
  if (filters.search) {
    chips.push({
      tone: "search",
      label: `${t("search")}: ${filters.search}`,
      href: buildHref(filters, { search: undefined }),
    });
  }
  if (filters.saleMode) {
    chips.push({
      tone: "saleMode",
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
      tone: "price",
      label: `${t("priceRange")}: ${range}`,
      href: buildHref(filters, { minPrice: undefined, maxPrice: undefined }),
      isolate: true,
    });
  }

  if (filters.minDiscountPercent) {
    chips.push({
      tone: "discount",
      label: `${t("discount")}: ${t("discountOption", {
        percent: filters.minDiscountPercent,
      })}`,
      href: buildHref(filters, { minDiscountPercent: undefined }),
      isolate: true,
    });
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* TL — 651:4031 */}
        <div className="flex items-center gap-2.5">
          <h1 className="text-h1 text-ink-900">
            {category ? pickLocalized(category, "name", locale) : t("allItems")}
          </h1>
          <span className="bg-fill-100 text-ink-500 flex h-6 items-center rounded-12 px-2.5 text-[11px] font-medium">
            {t("itemCount", { count: total })}
          </span>
        </div>

        {/* Sort — 651:4035. A disclosure so it needs no JavaScript. */}
        <details className="relative">
          <summary className="bg-base border-line-200 flex h-[38px] cursor-pointer list-none items-center justify-center gap-2 rounded-10 border ps-3.5 pe-2.5">
            <span className="text-ink-900 text-[12px] font-medium">
              {t("sortValue", {
                value: t(
                  `sortOptions.${
                    SORT_OPTIONS.find((o) => o.value === filters.sort)
                      ?.labelKey ?? SORT_OPTIONS[0].labelKey
                  }`,
                ),
              })}
            </span>
            <ChevronDown className="text-ink-500 size-3" aria-hidden />
          </summary>

          <div className="bg-base border-line-200 absolute end-0 z-20 mt-1 flex min-w-full flex-col overflow-hidden rounded-10 border shadow-lg">
            {SORT_OPTIONS.map((option) => {
              const active = filters.sort === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildHref(filters, { sort: option.value })}
                  aria-current={active ? "true" : undefined}
                  className={`px-3.5 py-2 text-[12px] whitespace-nowrap ${
                    active
                      ? "bg-action-tint text-action font-semibold"
                      : "text-ink-700 hover:bg-surface"
                  }`}
                >
                  {t(`sortOptions.${option.labelKey}`)}
                </Link>
              );
            })}
          </div>
        </details>
      </div>

      {/* AF — 651:4038 */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className={`flex h-7 items-center justify-center gap-1.5 rounded-[14px] px-2.5 text-[11px] font-medium ${
                CHIP_TONE[chip.tone] ?? "bg-fill-100 text-ink-700"
              }`}
            >
              <bdi>{chip.label}</bdi>
              <X className="size-2.5" strokeWidth={3} aria-hidden />
            </Link>
          ))}

          {hasActiveFilters(filters) && (
            <Link
              href="/products"
              className="text-error ms-1 text-[12px] font-medium"
            >
              {t("clearAll")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

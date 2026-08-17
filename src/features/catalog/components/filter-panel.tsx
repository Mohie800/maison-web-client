import { getTranslations, getLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import { CONDITIONS } from "@/lib/api/schemas/listing";
import {
  buildHref,
  FILTER_SUPPORT,
  SALE_MODES,
  type PlpFilters,
} from "../filters";
import type { Category } from "@/lib/api/schemas/catalog";
import type { Locale } from "@/i18n/routing";

interface Brand {
  id: string;
  name: string;
}

/**
 * PLP sidebar — Figma node 651:3930.
 *
 * Grouped collapsible panels, matching the design. Built on `<details>` so the
 * open/closed state is native: no JavaScript, no hydration, and each group
 * remembers nothing it shouldn't. Groups with an active filter start open.
 *
 * Every control is a link or a plain GET form, so the whole panel is
 * server-rendered and each filter state is a real, shareable URL.
 *
 * Facets the API can't serve are omitted rather than disabled — see
 * `FILTER_SUPPORT`. A greyed-out "Size" invites bug reports; an absent one
 * promises nothing. Item counts per option (the design shows "4,230") need
 * facet counts the API doesn't return, so they're left out rather than faked.
 */
export async function FilterPanel({
  filters,
  categories,
  brands,
}: {
  filters: PlpFilters;
  categories: Category[];
  brands: Brand[];
}) {
  const t = await getTranslations("Catalog");
  const tListing = await getTranslations("Listing");
  const locale = (await getLocale()) as Locale;

  return (
    <aside className="w-full shrink-0 lg:w-[260px]">
      <div className="border-line bg-base divide-line divide-y overflow-hidden rounded-16 border">
        {FILTER_SUPPORT.category && (
          <FilterGroup title={t("category")} open={Boolean(filters.categoryId)}>
            <ul className="flex flex-col">
              {categories.map((category) => {
                const active = filters.categoryId === category.id;
                return (
                  <li key={category.id}>
                    <Link
                      href={buildHref(filters, {
                        categoryId: active ? undefined : category.id,
                      })}
                      aria-current={active ? "true" : undefined}
                      className={`text-body flex items-center justify-between py-1.5 ${
                        active
                          ? "text-action font-semibold"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {pickLocalized(category, "name", locale)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </FilterGroup>
        )}

        {FILTER_SUPPORT.condition && (
          <FilterGroup title={t("condition")} open={Boolean(filters.condition)}>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((condition) => {
                const active = filters.condition === condition;
                return (
                  <Link
                    key={condition}
                    href={buildHref(filters, {
                      condition: active ? undefined : condition,
                    })}
                    aria-pressed={active}
                    className={`text-caption rounded-[16px] border px-3 py-1.5 ${
                      active
                        ? "border-action bg-action-tint text-action font-semibold"
                        : "border-line text-ink-secondary hover:border-ink-tertiary"
                    }`}
                  >
                    {tListing(`conditions.${condition}`)}
                  </Link>
                );
              })}
            </div>
          </FilterGroup>
        )}

        {FILTER_SUPPORT.price && (
          <FilterGroup
            title={t("priceRange")}
            open={Boolean(filters.minPrice || filters.maxPrice)}
            summary={
              filters.minPrice && filters.maxPrice
                ? t("priceBetween", {
                    min: filters.minPrice,
                    max: filters.maxPrice,
                  })
                : filters.minPrice
                  ? t("priceFrom", { min: filters.minPrice })
                  : filters.maxPrice
                    ? t("priceUpTo", { max: filters.maxPrice })
                    : undefined
            }
          >
            {/*
              A GET form rather than a slider: it submits without JavaScript, the
              range lands in the URL, and there's no facet data to derive slider
              bounds from anyway.
            */}
            <form action="/products" className="flex flex-col gap-3">
              {/* Carry the other filters through the submit. */}
              {filters.categoryId && (
                <input type="hidden" name="categoryId" value={filters.categoryId} />
              )}
              {filters.brandId && (
                <input type="hidden" name="brandId" value={filters.brandId} />
              )}
              {filters.condition && (
                <input type="hidden" name="condition" value={filters.condition} />
              )}
              {filters.search && <input type="hidden" name="q" value={filters.search} />}
              {filters.saleMode && (
                <input type="hidden" name="saleMode" value={filters.saleMode} />
              )}

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="minPrice"
                  min={0}
                  inputMode="numeric"
                  defaultValue={filters.minPrice ?? ""}
                  placeholder={t("min")}
                  aria-label={t("minPrice")}
                  dir="ltr"
                  className="border-line bg-fill-50 text-caption h-10 w-full rounded-10 border px-3 outline-none focus:border-focus"
                />
                <span className="text-ink-tertiary" aria-hidden>
                  –
                </span>
                <input
                  type="number"
                  name="maxPrice"
                  min={0}
                  inputMode="numeric"
                  defaultValue={filters.maxPrice ?? ""}
                  placeholder={t("max")}
                  aria-label={t("maxPrice")}
                  dir="ltr"
                  className="border-line bg-fill-50 text-caption h-10 w-full rounded-10 border px-3 outline-none focus:border-focus"
                />
              </div>

              <button
                type="submit"
                className="border-ink text-caption h-9 rounded-[18px] border font-semibold"
              >
                {t("applyPrice")}
              </button>
            </form>
          </FilterGroup>
        )}

        {FILTER_SUPPORT.saleMode && (
          <FilterGroup title={t("saleType")} open={Boolean(filters.saleMode)}>
            <div className="flex flex-wrap gap-2">
              {SALE_MODES.map((mode) => {
                const active = filters.saleMode === mode;
                return (
                  <Link
                    key={mode}
                    href={buildHref(filters, {
                      saleMode: active ? undefined : mode,
                    })}
                    aria-pressed={active}
                    className={`text-caption rounded-[16px] border px-3 py-1.5 ${
                      active
                        ? "border-action bg-action-tint text-action font-semibold"
                        : "border-line text-ink-secondary hover:border-ink-tertiary"
                    }`}
                  >
                    {t(`saleModes.${mode}`)}
                  </Link>
                );
              })}
            </div>
          </FilterGroup>
        )}

        {FILTER_SUPPORT.brand && brands.length > 0 && (
          <FilterGroup
            title={t("brand")}
            open={Boolean(filters.brandId)}
            summary={brands
              .slice(0, 3)
              .map((b) => b.name)
              .join(" · ")}
          >
            {/*
              Single-select: `GET /listings` takes one `brandId`. The design draws
              checkboxes, which implies multi-select — that needs the API to accept
              a list. Raised as part of API-06.
            */}
            <ul className="flex max-h-[280px] flex-col overflow-y-auto">
              {brands.map((brand) => {
                const active = filters.brandId === brand.id;
                return (
                  <li key={brand.id}>
                    <Link
                      href={buildHref(filters, {
                        brandId: active ? undefined : brand.id,
                      })}
                      aria-current={active ? "true" : undefined}
                      className={`text-body flex items-center justify-between py-1.5 ${
                        active
                          ? "text-action font-semibold"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {brand.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </FilterGroup>
        )}
      </div>
    </aside>
  );
}

/**
 * Collapsible group. `<details open>` gives native disclosure with no client
 * JavaScript; `group-open:rotate-180` turns the chevron from CSS alone.
 */
function FilterGroup({
  title,
  summary,
  open = false,
  children,
}: {
  title: string;
  summary?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-label">{title}</span>
          {summary && (
            <span className="text-caption text-ink-tertiary truncate group-open:hidden">
              {/* bdi isolates mixed Latin/Arabic runs from bidi reordering. */}
              <bdi>{summary}</bdi>
            </span>
          )}
        </span>
        <ChevronDown
          className="text-ink-tertiary size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

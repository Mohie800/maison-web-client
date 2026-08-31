import { getTranslations, getLocale } from "next-intl/server";
import { Check, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import { CONDITIONS } from "@/lib/api/schemas/listing";
import {
  buildHref,
  DISCOUNT_THRESHOLDS,
  FILTER_SUPPORT,
  SALE_MODES,
  type PlpFilters,
} from "../filters";
import type {
  Category,
  ListingFacets,
  Material,
} from "@/lib/api/schemas/catalog";
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
 * promises nothing.
 *
 * The per-option counts the design draws ("4,230") come from
 * `GET /listings/facets` (GAP-31), counted with every other active filter
 * applied but this one lifted — so a count is what the grid would hold if you
 * ticked that row. An option the facet doesn't mention has no matches under the
 * current filters and shows no number rather than a zero.
 */
export async function FilterPanel({
  filters,
  categories,
  brands,
  facets,
  materials = [],
  basePath = "/products",
}: {
  filters: PlpFilters;
  categories: Category[];
  brands: Brand[];
  facets?: ListingFacets | null;
  materials?: Material[];
  /** The search results page reuses this panel on its own path (plans/09 C32). */
  basePath?: string;
}) {
  const t = await getTranslations("Catalog");
  const tListing = await getTranslations("Listing");
  const locale = (await getLocale()) as Locale;

  /** Facet lookups, keyed the way each list identifies its options. */
  const countBy = (
    rows:
      | { id?: string | null; value?: string | null; count: number }[]
      | null
      | undefined,
    key: "id" | "value",
  ) => new Map((rows ?? []).map((row) => [row[key] ?? "", row.count]));

  /*
   * The facet counts leaves — a listing sits on exactly one — while the sidebar
   * lists top-level categories, so each row's number is its own plus every
   * descendant's. Without this roll-up the category rows show nothing at all.
   */
  const leafCounts = countBy(facets?.categories, "id");
  const rollUp = (category: Category): number | undefined => {
    let total = leafCounts.get(category.id) ?? 0;
    let seen = leafCounts.has(category.id);
    for (const child of category.children ?? []) {
      const childTotal = rollUp(child);
      if (childTotal !== undefined) {
        total += childTotal;
        seen = true;
      }
    }
    return seen ? total : undefined;
  };
  const categoryCounts = new Map(
    categories.map((category) => [category.id, rollUp(category)]),
  );
  const brandCounts = countBy(facets?.brands, "id");
  const conditionCounts = countBy(facets?.conditions, "value");
  const saleModeCounts = countBy(facets?.saleModes, "value");
  const materialCounts = countBy(facets?.materials, "id");
  const discountRows = facets?.discountThresholds?.map(
    (row) => row.minPercent,
  ) ?? [...DISCOUNT_THRESHOLDS];
  const discountCounts = new Map(
    (facets?.discountThresholds ?? []).map((row) => [
      row.minPercent,
      row.count,
    ]),
  );

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
                      href={buildHref(
                        filters,
                        {
                          categoryId: active ? undefined : category.id,
                        },
                        basePath,
                      )}
                      aria-current={active ? "true" : undefined}
                      className={`text-body flex items-center justify-between py-1.5 ${
                        active
                          ? "text-action font-semibold"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      <span className="truncate">
                        {pickLocalized(category, "name", locale)}
                      </span>
                      <FacetCount value={categoryCounts.get(category.id)} />
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
                    href={buildHref(
                      filters,
                      {
                        condition: active ? undefined : condition,
                      },
                      basePath,
                    )}
                    aria-pressed={active}
                    className={`text-caption rounded-[16px] border px-3 py-1.5 ${
                      active
                        ? "border-action bg-action-tint text-action font-semibold"
                        : "border-line text-ink-secondary hover:border-ink-tertiary"
                    }`}
                  >
                    {tListing(`conditions.${condition}`)}
                    <FacetCount value={conditionCounts.get(condition)} inline />
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
            <form action={basePath} className="flex flex-col gap-3">
              {/* Carry the other filters through the submit. */}
              {filters.categoryId && (
                <input
                  type="hidden"
                  name="categoryId"
                  value={filters.categoryId}
                />
              )}
              {filters.brandId && (
                <input type="hidden" name="brandId" value={filters.brandId} />
              )}
              {filters.condition && (
                <input
                  type="hidden"
                  name="condition"
                  value={filters.condition}
                />
              )}
              {filters.search && (
                <input type="hidden" name="q" value={filters.search} />
              )}
              {filters.saleMode && (
                <input type="hidden" name="saleMode" value={filters.saleMode} />
              )}
              {filters.minDiscountPercent && (
                <input
                  type="hidden"
                  name="minDiscountPercent"
                  value={filters.minDiscountPercent}
                />
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

        {/* PLP_Filter_Discount — 672:214, in context at 672:246. */}
        {FILTER_SUPPORT.discount && (
          <FilterGroup
            title={t("discount")}
            open={Boolean(filters.minDiscountPercent)}
            summary={
              filters.minDiscountPercent
                ? t("discountOption", { percent: filters.minDiscountPercent })
                : undefined
            }
          >
            <ul className="flex flex-col">
              {discountRows.map((threshold) => {
                const active = filters.minDiscountPercent === String(threshold);
                return (
                  <li key={threshold}>
                    {/*
                      A link styled as a checkbox, not an <input>: the design
                      draws checkboxes, but each row is a whole filter state and
                      a URL, which is what makes the panel work without
                      JavaScript. `aria-pressed` reports the real semantics.
                    */}
                    <Link
                      href={buildHref(
                        filters,
                        {
                          minDiscountPercent: active
                            ? undefined
                            : String(threshold),
                        },
                        basePath,
                      )}
                      aria-pressed={active}
                      className="group/row flex items-center gap-3 py-2"
                    >
                      <span
                        className={`flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border ${
                          active
                            ? "border-action bg-action"
                            : "border-line group-hover/row:border-ink-tertiary"
                        }`}
                        aria-hidden
                      >
                        {active && <Check className="text-on-accent size-3" />}
                      </span>
                      <span
                        className={`text-body ${
                          active ? "font-semibold" : "text-ink-secondary"
                        }`}
                      >
                        {t("discountOption", { percent: threshold })}
                      </span>
                      <FacetCount value={discountCounts.get(threshold)} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </FilterGroup>
        )}

        {/* PLP_TradeFilter — 651:4179. The whole of that frame is this group. */}
        {FILTER_SUPPORT.saleMode && (
          <FilterGroup title={t("saleType")} open={Boolean(filters.saleMode)}>
            <div className="flex flex-wrap gap-2">
              {SALE_MODES.map((mode) => {
                const active = filters.saleMode === mode;
                return (
                  <Link
                    key={mode}
                    href={buildHref(
                      filters,
                      {
                        saleMode: active ? undefined : mode,
                      },
                      basePath,
                    )}
                    aria-pressed={active}
                    className={`text-caption rounded-[16px] border px-3 py-1.5 ${
                      active
                        ? "border-action bg-action-tint text-action font-semibold"
                        : "border-line text-ink-secondary hover:border-ink-tertiary"
                    }`}
                  >
                    {t(`saleModes.${mode}`)}
                    <FacetCount value={saleModeCounts.get(mode)} inline />
                  </Link>
                );
              })}
            </div>
          </FilterGroup>
        )}

        {FILTER_SUPPORT.material && materials.length > 0 && (
          <FilterGroup title={t("material")} open={Boolean(filters.materialId)}>
            {/*
              Names come from `GET /materials`, counts from the facet block
              (GAP-50). A material with no inventory is omitted from the facet,
              so it is dropped here too — matching categories and brands.
            */}
            <ul className="flex max-h-[280px] flex-col overflow-y-auto">
              {materials.map((material) => {
                const active = filters.materialId === material.id;
                const count = materialCounts.get(material.id);
                if (count == null && !active) return null;
                return (
                  <li key={material.id}>
                    <Link
                      href={buildHref(
                        filters,
                        {
                          materialId: active ? undefined : material.id,
                        },
                        basePath,
                      )}
                      aria-current={active ? "true" : undefined}
                      className={`text-body flex items-center justify-between py-1.5 ${
                        active
                          ? "text-action font-semibold"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      <span className="truncate">
                        {pickLocalized(material, "name", locale)}
                      </span>
                      <FacetCount value={count} />
                    </Link>
                  </li>
                );
              })}
            </ul>
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
                      href={buildHref(
                        filters,
                        {
                          brandId: active ? undefined : brand.id,
                        },
                        basePath,
                      )}
                      aria-current={active ? "true" : undefined}
                      className={`text-body flex items-center justify-between py-1.5 ${
                        active
                          ? "text-action font-semibold"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      <span className="truncate">{brand.name}</span>
                      <FacetCount value={brandCounts.get(brand.id)} />
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

/**
 * The count beside an option — Figma `672:263`, 12px tertiary, right aligned.
 *
 * Renders nothing when the facet doesn't mention the option: that means no
 * matches under the current filters, and a bare "0" beside every unavailable
 * row is noise rather than information.
 */
function FacetCount({ value, inline }: { value?: number; inline?: boolean }) {
  if (value === undefined) return null;
  return (
    <span
      className={`text-ink-tertiary shrink-0 text-[12px] ${inline ? "ms-1.5" : "ms-3"}`}
      dir="ltr"
    >
      {value.toLocaleString("en-US")}
    </span>
  );
}

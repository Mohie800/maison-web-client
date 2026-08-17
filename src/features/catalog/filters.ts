import type { ListingQuery } from "@/lib/api/endpoints/listings";

/**
 * Which PLP filters the API can actually serve.
 *
 * The design's filter panel is wider than `GET /listings` supports. Rather than
 * render controls that silently do nothing — unknown query params are ignored
 * server-side, so a filter appears to apply and simply doesn't — unsupported
 * facets are hidden behind this map.
 *
 * When the backend ships API-06 / API-07, flip the flag and add the param to
 * `toListingQuery` below. Nothing else needs to change: the UI, URL state and
 * chips are already written against these keys.
 */
export const FILTER_SUPPORT = {
  category: true,
  condition: true,
  brand: true,
  search: true,
  sort: true,
  /** Shipped in the backend's gaps drop and verified filtering correctly. */
  price: true,
  saleMode: true,

  /**
   * `minDiscountPercent` filters `items` but leaves `total` unfiltered
   * (BUG-01), so enabling it would show "5 items" above an empty grid and offer
   * pages that don't exist. Off until the count query is fixed.
   */
  discount: false,
  /** `materialId` returns 500 for every value, including real ids (BUG-02). */
  material: false,
  /** `attributes` JSON isn't filterable, so size can't be queried at all. */
  size: false,
} as const;

export type FilterKey = keyof typeof FILTER_SUPPORT;

/** Sorts the API accepts. The design also shows options that don't exist yet. */
export const SORT_OPTIONS = [
  { value: "created_at_desc", labelKey: "newest" },
  { value: "price_asc", labelKey: "priceAsc" },
  { value: "price_desc", labelKey: "priceDesc" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortValue = "created_at_desc";
export const PAGE_SIZE = 24;

/** Filter state, parsed from and serialised to the URL. */
export interface PlpFilters {
  categoryId?: string;
  brandId?: string;
  condition?: string;
  search?: string;
  saleMode?: string;
  minPrice?: string;
  maxPrice?: string;
  sort: SortValue;
  page: number;
}

export const SALE_MODES = ["fixed", "negotiable", "auction", "trade"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

/**
 * The URL is the source of truth for filter state — that's what makes a
 * filtered PLP server-rendered, shareable, and indexable.
 */
export function parseFilters(params: SearchParams): PlpFilters {
  const sort = first(params.sort);
  const page = Number(first(params.page) ?? 1);

  return {
    categoryId: first(params.categoryId),
    brandId: first(params.brandId),
    condition: first(params.condition),
    search: first(params.q),
    saleMode: first(params.saleMode),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
    sort: SORT_OPTIONS.some((o) => o.value === sort)
      ? (sort as SortValue)
      : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/** Only sends params the API understands. */
export function toListingQuery(filters: PlpFilters): ListingQuery {
  return {
    page: filters.page,
    limit: PAGE_SIZE,
    sort: filters.sort,
    ...(FILTER_SUPPORT.category && filters.categoryId
      ? { categoryId: filters.categoryId }
      : {}),
    ...(FILTER_SUPPORT.brand && filters.brandId
      ? { brandId: filters.brandId }
      : {}),
    ...(FILTER_SUPPORT.condition && filters.condition
      ? { condition: filters.condition }
      : {}),
    ...(FILTER_SUPPORT.search && filters.search
      ? { search: filters.search }
      : {}),
    ...(FILTER_SUPPORT.saleMode && filters.saleMode
      ? { saleMode: filters.saleMode as "fixed" | "negotiable" | "auction" | "trade" }
      : {}),
    // Sent as numbers; blank or non-numeric input is dropped rather than sent.
    ...(FILTER_SUPPORT.price && numeric(filters.minPrice) !== undefined
      ? { minPrice: numeric(filters.minPrice) }
      : {}),
    ...(FILTER_SUPPORT.price && numeric(filters.maxPrice) !== undefined
      ? { maxPrice: numeric(filters.maxPrice) }
      : {}),
  };
}

function numeric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Builds a PLP href with one filter changed; changing a filter resets paging. */
export function buildHref(
  filters: PlpFilters,
  patch: Partial<PlpFilters>,
): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (next.categoryId) params.set("categoryId", next.categoryId);
  if (next.brandId) params.set("brandId", next.brandId);
  if (next.condition) params.set("condition", next.condition);
  if (next.search) params.set("q", next.search);
  if (next.saleMode) params.set("saleMode", next.saleMode);
  if (next.minPrice) params.set("minPrice", next.minPrice);
  if (next.maxPrice) params.set("maxPrice", next.maxPrice);
  if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort);

  const page = patch.page ?? 1;
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export function hasActiveFilters(filters: PlpFilters): boolean {
  return Boolean(
    filters.categoryId ||
      filters.brandId ||
      filters.condition ||
      filters.search ||
      filters.saleMode ||
      filters.minPrice ||
      filters.maxPrice,
  );
}

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
   * BUG-01 is fixed — `minDiscountPercent` filters `total` and pages in the
   * database (verified 2026-08-23: `?minDiscountPercent=20` → total 46,
   * items 46). The sidebar control is built to the design's own thresholds
   * (Figma `672:94`).
   */
  discount: true,
  /**
   * On since GAP-35: the filter resolves the id and matches the material's
   * name or slug as well as `attributes.materialId`, so it returns rows the
   * backfill hasn't stamped. Verified 2026-08-28 — cotton returns 4 listings.
   */
  material: true,
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
  /** Whole percent, 0–100. The API 400s outside that range. */
  minDiscountPercent?: string;
  materialId?: string;
  sort: SortValue;
  page: number;
}

export const SALE_MODES = ["fixed", "negotiable", "auction", "trade"] as const;

/**
 * Discount thresholds, from the design's filter panel (Figma `672:94`) — the
 * six "N% or more" rows, in its order.
 *
 * Drawn as checkboxes there but only ever one is ticked, and "20% or more"
 * already contains "40% or more", so ticking both would be meaningless. It
 * behaves as a single choice, which is also what `minDiscountPercent` accepts.
 *
 * The design puts a facet count beside each row ("3,867"), and `GET
 * /listings/facets` now returns them (GAP-31) — including these buckets, which
 * is why the panel prefers the server's list over this one. This stays as the
 * fallback for when the facet call fails.
 */
export const DISCOUNT_THRESHOLDS = [20, 30, 40, 50, 60, 70] as const;

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
    minDiscountPercent: first(params.minDiscountPercent),
    materialId: first(params.materialId),
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
      ? {
          saleMode: filters.saleMode as
            "fixed" | "negotiable" | "auction" | "trade",
        }
      : {}),
    // Sent as numbers; blank or non-numeric input is dropped rather than sent.
    ...(FILTER_SUPPORT.price && numeric(filters.minPrice) !== undefined
      ? { minPrice: numeric(filters.minPrice) }
      : {}),
    ...(FILTER_SUPPORT.price && numeric(filters.maxPrice) !== undefined
      ? { maxPrice: numeric(filters.maxPrice) }
      : {}),
    // Out-of-range values are dropped rather than sent — the API 400s on them.
    ...(FILTER_SUPPORT.discount &&
    percentage(filters.minDiscountPercent) !== undefined
      ? { minDiscountPercent: percentage(filters.minDiscountPercent) }
      : {}),
    ...(FILTER_SUPPORT.material && filters.materialId
      ? { materialId: filters.materialId }
      : {}),
  };
}

function percentage(value: string | undefined): number | undefined {
  const n = numeric(value);
  return n !== undefined && n <= 100 ? Math.floor(n) : undefined;
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
  /** The search results page carries the same filter model on its own path. */
  base = "/products",
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
  if (next.minDiscountPercent)
    params.set("minDiscountPercent", next.minDiscountPercent);
  if (next.materialId) params.set("materialId", next.materialId);
  if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort);

  const page = patch.page ?? 1;
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function hasActiveFilters(filters: PlpFilters): boolean {
  return Boolean(
    filters.categoryId ||
    filters.brandId ||
    filters.condition ||
    filters.search ||
    filters.saleMode ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.materialId ||
    filters.minDiscountPercent,
  );
}

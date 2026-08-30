import { z } from "zod";

/**
 * Hand-written response schemas.
 *
 * The OpenAPI spec documents request DTOs only — every operation is declared as
 * `{ "200": { "description": "" } }` with no response body (plans/06 G10). So
 * these are derived from probing the live API and are validated at the
 * boundary, which turns silent backend field renames into loud failures.
 *
 * If the backend adds @ApiOkResponse annotations, these can be replaced by
 * generated types.
 */

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  nameEn: z.string().nullable(),
  nameAr: z.string().nullable(),
  /** Small mark for chips and menus. `imageUrl` is the card photograph. */
  iconUrl: z.string().nullable(),
  imageUrl: z.string().nullish(),
  /**
   * Live listings, **rolled up through children** (GAP-31) — so a top-level
   * card counts its whole subtree, which is what it's offering. Sellers file on
   * leaves, so counting only direct children would read close to zero.
   */
  listingCount: z.number().nullish(),
  _count: z
    .object({ children: z.number().nullish(), listings: z.number().nullish() })
    .nullish(),
  sortOrder: z.number(),
  parentId: z.string().nullable().optional(),
});

export type Category = z.infer<typeof categorySchema> & {
  children?: Category[];
};

/** Categories nest arbitrarily deep, so the schema is recursive. */
export const categoryTreeSchema: z.ZodType<Category> = categorySchema.extend({
  children: z.lazy(() => categoryTreeSchema.array()).optional(),
});

/** `GET /materials` — a first-class entity since GAP-35, so the facet has ids. */
export const materialSchema = z.object({
  id: z.string(),
  slug: z.string().nullish(),
  name: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  sortOrder: z.number().nullish(),
});

export type Material = z.infer<typeof materialSchema>;

/**
 * `GET /listings/facets` — option counts for the PLP sidebar (GAP-31).
 *
 * Takes the same query parameters as `GET /listings`, and each facet is counted
 * with every **other** active filter applied but its own lifted. So ticking a
 * second brand widens the list to the number shown beside it, which is the
 * convention a multi-select facet implies.
 */
const facetCountSchema = z.object({
  id: z.string().nullish(),
  value: z.string().nullish(),
  name: z.string().nullish(),
  nameEn: z.string().nullish(),
  slug: z.string().nullish(),
  count: z.number(),
});

export const listingFacetsSchema = z.object({
  categories: z.array(facetCountSchema).nullish(),
  brands: z.array(facetCountSchema).nullish(),
  conditions: z.array(facetCountSchema).nullish(),
  saleModes: z.array(facetCountSchema).nullish(),
  discountThresholds: z
    .array(z.object({ minPercent: z.number(), count: z.number() }))
    .nullish(),
  specialTags: z.array(facetCountSchema).nullish(),
  /**
   * GAP-50. Counted like the rest, and counts both spellings — a row stamped
   * with `attributes.materialId` and one still carrying a bare `material` name
   * both fall under the same material, so the numbers survive the Round 3
   * backfill either way.
   */
  materials: z.array(facetCountSchema).nullish(),
});

export type ListingFacets = z.infer<typeof listingFacetsSchema>;

export const bannerSchema = z.object({
  id: z.string(),
  titleEn: z.string().nullable(),
  titleAr: z.string().nullable(),
  subtitleEn: z.string().nullable(),
  subtitleAr: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  descriptionAr: z.string().nullable(),
  ctaLabelEn: z.string().nullable(),
  ctaLabelAr: z.string().nullable(),
  imageUrl: z.string().nullable(),
  placement: z.string(),
  linkType: z.string(),
  linkValue: z.string().nullable(),
  sortOrder: z.number(),
});

export type Banner = z.infer<typeof bannerSchema>;

export const BANNER_PLACEMENTS = [
  "home_hero",
  "home_mid",
  "search_top",
  "category_top",
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

/**
 * `GET /brands` — the full row, since GAP-53 exposed what the table already
 * held. Still a bare array, deliberately: wrapping it would break every caller
 * reading it as a list. `?limit=` caps it.
 *
 * Two of the flags are editorial and two are computed, which matters when a tab
 * comes back empty:
 *
 * - `isOfficial`, `isTrending`, `isSaudi` are set by merchandising. All twelve
 *   brands on dev read false, so those tabs are empty until someone sets them.
 * - `categoryType` is the track the brand's *live* listings mostly sit in, and
 *   is null for a brand with none — a fact about inventory, not a column.
 * - `listingCount` is live items only, which is the shopping figure the card
 *   shows; `totalListingCount` includes sold and traded.
 */
export const brandDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  slug: z.string().nullish(),
  logoUrl: z.string().nullish(),
  sortOrder: z.number().nullish(),

  isOfficial: z.boolean().nullish(),
  isTrending: z.boolean().nullish(),
  isSaudi: z.boolean().nullish(),
  isVerified: z.boolean().nullish(),
  verifiedAt: z.string().nullish(),

  followersCount: z.number().nullish(),
  /** Only with a bearer token; false for a signed-out visitor. */
  isFollowing: z.boolean().nullish(),

  listingCount: z.number().nullish(),
  totalListingCount: z.number().nullish(),
  categoryType: z.string().nullish(),

  ratingAvg: z.union([z.string(), z.number()]).nullish(),
  ratingCount: z.number().nullish(),
});

export type BrandDetail = z.infer<typeof brandDetailSchema>;

/** `?filter=` — the first three are editorial, the last four are inventory. */
export const BRAND_FILTERS = [
  "all",
  "official",
  "trending",
  "saudi",
  "fashion",
  "electronics",
  "furniture",
  "toys_art",
] as const;
export type BrandFilter = (typeof BRAND_FILTERS)[number];

export const BRAND_SORTS = ["popular", "followers", "name", "newest"] as const;
export type BrandSort = (typeof BRAND_SORTS)[number];

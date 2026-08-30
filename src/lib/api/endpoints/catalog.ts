import { apiFetch } from "../client";
import { parseResponse } from "../parse";
import { serverApiFetch } from "../server";
import {
  bannerSchema,
  brandDetailSchema,
  categoryTreeSchema,
  materialSchema,
  type Banner,
  type BannerPlacement,
  type BrandDetail,
  type BrandFilter,
  type BrandSort,
  type Category,
  type Material,
} from "../schemas/catalog";
import { z } from "zod";
import { trackSchemaSchema } from "../schemas/track-schema";

/**
 * Catalog reference data — public, cacheable, and rarely changing.
 * Fetched on the server with a long revalidate rather than per-request.
 */

export async function getCategoryTree(): Promise<Category[]> {
  const data = await apiFetch<unknown>("/categories/tree", {
    next: { revalidate: 3600, tags: ["categories"] },
  });
  return parseResponse(z.array(categoryTreeSchema), data, "GET /categories/tree");
}

export async function getBanners(
  placement: BannerPlacement,
): Promise<Banner[]> {
  const data = await apiFetch<unknown>("/banners", {
    params: { placement },
    next: { revalidate: 300, tags: ["banners"] },
  });
  return parseResponse(z.array(bannerSchema), data, "GET /banners");
}

const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Bilingual like categories and banners — use pickLocalized(brand, "name", …).
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  slug: z.string().nullish(),
  logoUrl: z.string().nullish(),
  sortOrder: z.number().nullish(),
});

export type Brand = z.infer<typeof brandSchema>;

/** All brands — used by the PLP filter panel and the brands page. */
export async function getBrands(): Promise<Brand[]> {
  const data = await apiFetch<unknown>("/brands", {
    next: { revalidate: 3600, tags: ["brands"] },
  });
  return parseResponse(z.array(brandSchema), data, "GET /brands");
}

/** Materials, for the PLP material facet — ids the filter can be built from. */
export async function getMaterials(): Promise<Material[]> {
  const data = await apiFetch<unknown>("/materials", {
    next: { revalidate: 3600, tags: ["catalog"] },
  });
  return parseResponse(z.array(materialSchema), data, "GET /materials");
}

/**
 * `GET /lookups/track-schema/{type}` — the generated field list for a category
 * type: attributes with kind/required/options, the conditions that type
 * allows, and the defect checklist. Public, and stable enough to cache.
 */
export async function getTrackSchema(type: string) {
  const data = await apiFetch<unknown>(`/lookups/track-schema/${type}`, {
    next: { revalidate: 3600, tags: ["lookups"] },
  });
  return trackSchemaSchema.parse(data);
}

/**
 * The brands page's list — filtered, sorted, and with `isFollowing` filled in.
 *
 * Not cached and not the same call as `getBrands()`: `isFollowing` is the
 * viewer's own state, so a shared cache entry would show one person's follows
 * to another.
 */
export async function getBrandDirectory(query: {
  filter?: BrandFilter;
  sort?: BrandSort;
  search?: string;
} = {}): Promise<BrandDetail[]> {
  const data = await serverApiFetch<unknown>("/brands", {
    params: {
      filter: query.filter ?? "all",
      sort: query.sort ?? "popular",
      ...(query.search ? { search: query.search } : {}),
    },
  });
  return parseResponse(z.array(brandDetailSchema), data, "GET /brands");
}

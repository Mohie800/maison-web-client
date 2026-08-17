import { apiFetch } from "../client";
import { parseResponse } from "../parse";
import {
  bannerSchema,
  categoryTreeSchema,
  type Banner,
  type BannerPlacement,
  type Category,
} from "../schemas/catalog";
import { z } from "zod";

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

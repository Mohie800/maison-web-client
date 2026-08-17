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
  iconUrl: z.string().nullable(),
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

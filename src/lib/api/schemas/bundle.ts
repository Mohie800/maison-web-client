import { z } from "zod";
import { listingSchema } from "./listing";

/**
 * Bundles — `GET /bundles`, `GET /bundles/{id}`, `POST /bundles`.
 *
 * Shapes read off the live rows on dev. Unlike the trade payloads, this one
 * arrives ready to render: the savings are pre-computed, `coverPhotoUrls` is
 * the mosaic, and each item embeds its whole listing including `photos`.
 *
 * Money is mixed here — `bundlePrice` is a decimal string while the derived
 * totals are numbers — so everything goes through the same union.
 */
const money = z.union([z.string(), z.number()]).nullish();

export const bundleItemSchema = z.object({
  id: z.string(),
  bundleId: z.string().nullish(),
  listingId: z.string(),
  /** The listing embeds `photos` but not `seller` — the bundle carries that. */
  listing: listingSchema.nullish(),
});

export type BundleItem = z.infer<typeof bundleItemSchema>;

export const bundleSchema = z.object({
  id: z.string(),
  sellerId: z.string().nullish(),
  title: z.string(),
  bundlePrice: money,
  /** Sum of the items' own prices, which the frame strikes through. */
  originalTotal: money,
  savingsAmount: money,
  discountPercent: z.number().nullish(),
  itemCount: z.number().nullish(),
  /** `isActive` is the seller's switch; `isAvailable` also weighs the items. */
  isActive: z.boolean().nullish(),
  isAvailable: z.boolean().nullish(),
  coverPhotoUrls: z.array(z.string()).nullish(),
  seller: z
    .object({
      id: z.string(),
      handle: z.string().nullish(),
      profilePic: z.string().nullish(),
      isVerified: z.boolean().nullish(),
    })
    .nullish(),
  items: z.array(bundleItemSchema).nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export type Bundle = z.infer<typeof bundleSchema>;

export const bundleListSchema = z.object({
  items: z.array(bundleSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
  hasMore: z.boolean().nullish(),
});

/** `GET /bundles?sort=` — the API offers exactly these two. */
export const BUNDLE_SORTS = ["newest", "savings_desc"] as const;
export type BundleSort = (typeof BUNDLE_SORTS)[number];

export function isBundleSort(value: string): value is BundleSort {
  return (BUNDLE_SORTS as readonly string[]).includes(value);
}

/** `POST /bundles` — at least two of your own live listings. */
export const MIN_BUNDLE_ITEMS = 2;

import { z } from "zod";

/**
 * Reviews — `GET /reviews/orders/{orderId}/reviewable` and `POST /reviews`.
 *
 * The request shape comes from `CreateReviewDto` in the API's own OpenAPI
 * document rather than from trial and error, which is where the tag list and
 * the comment limit below are from.
 */

/** `tags` on CreateReviewDto — a closed enum, not free text. */
export const REVIEW_TAGS = [
  "as_described",
  "fast_shipping",
  "great_packaging",
  "authentic",
  "good_condition",
  "friendly_seller",
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];

export const COMMENT_MAX = 500;
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Up to five, per the DTO — the frame draws four tiles. */
export const PHOTOS_MAX = 5;

export const reviewableItemSchema = z.object({
  orderItemId: z.string(),
  listingId: z.string().nullish(),
  title: z.string().nullish(),
  price: z.union([z.string(), z.number()]).nullish(),
  coverPhotoUrl: z.string().nullish(),
  seller: z
    .object({
      id: z.string().nullish(),
      username: z.string().nullish(),
      fullName: z.string().nullish(),
      profilePic: z.string().nullish(),
    })
    .nullish(),
});

export type ReviewableItem = z.infer<typeof reviewableItemSchema>;

export const reviewableSchema = z.object({
  orderId: z.string().nullish(),
  items: z.array(reviewableItemSchema),
});

export function isReviewTag(value: unknown): value is ReviewTag {
  return REVIEW_TAGS.includes(value as ReviewTag);
}

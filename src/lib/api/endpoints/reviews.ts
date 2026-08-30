import { apiFetch } from "@/lib/api/client";
import { parseResponse } from "@/lib/api/parse";
import { sellerReviewsSchema } from "@/lib/api/schemas/seller";

/**
 * A listing's reviews — `GET /reviews/listings/{id}`, public since GAP-71.
 *
 * Same row shape as `GET /sellers/{id}/reviews`, so the two share a schema.
 * Two differences worth knowing: this one carries no `summary` block, and
 * `verifiedBuyer` / `purchasedTitle` are not on it — the first is redundant
 * here (every reviewer bought *this* item) and the second is the page you are
 * already on.
 *
 * Cached like the rest of the PDP: reviews are public, indexable content and a
 * new one appearing a minute late costs nothing.
 */
export async function getListingReviews(
  id: string,
  query: { page?: number; limit?: number } = {},
) {
  const data = await apiFetch<unknown>(`/reviews/listings/${id}`, {
    params: { ...query, limit: query.limit ?? 6 },
    next: { revalidate: 120, tags: ["reviews", `listing:${id}:reviews`] },
  });
  return parseResponse(
    sellerReviewsSchema,
    data,
    `GET /reviews/listings/${id}`,
  );
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import {
  COMMENT_MAX,
  isReviewTag,
  PHOTOS_MAX,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/api/schemas/review";
import { uploadAllMedia } from "@/lib/api/endpoints/media";

/**
 * `POST /reviews` — one review per order item, buyer only, delivered items only.
 *
 * Posted from a plain form, so a review can be left without JavaScript; the
 * star row degrades to radio inputs, the tags to checkboxes and the photo
 * tiles to file inputs.
 *
 * Photos are uploaded here rather than in the browser — `POST /media` turns
 * each file into a path and `photos` takes those paths (GAP-72). A photo that
 * fails to upload is dropped rather than failing the review: the rating and
 * the words are the point, and losing them over a picture would be worse.
 */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.messages.join(" ");
    if (/already/i.test(message)) return "alreadyReviewed";
    if (/delivered/i.test(message)) return "notDelivered";
    if (error.isNotFound) return "itemNotFound";
    if (error.isUnauthorized) return "unauthenticated";
    return "requestFailed";
  }
  return "requestFailed";
}

export async function submitReviewAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const orderItemId = String(formData.get("orderItemId") ?? "");
  const page = `/${locale}/account/orders/${orderId}/review`;

  if (!orderId || !orderItemId) redirect(`/${locale}/account/orders`);

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < RATING_MIN || rating > RATING_MAX) {
    redirect(`${page}?error=ratingRequired`);
  }

  const comment = String(formData.get("comment") ?? "").trim();
  if (comment.length > COMMENT_MAX) redirect(`${page}?error=commentTooLong`);

  const tags = formData.getAll("tags").filter(isReviewTag);

  const chosen = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, PHOTOS_MAX);

  let photos: string[] = [];
  if (chosen.length > 0) {
    try {
      photos = await uploadAllMedia(chosen);
    } catch {
      // Non-fatal — see the note above.
    }
  }

  try {
    await serverApiFetch("/reviews", {
      method: "POST",
      body: {
        orderItemId,
        rating,
        ...(comment ? { comment } : {}),
        ...(tags.length ? { tags } : {}),
        ...(photos.length ? { photos } : {}),
      },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/orders/${orderId}`);
  redirect(`${page}?submitted=${rating}&item=${orderItemId}`);
}

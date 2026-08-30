"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import {
  COMMENT_MAX,
  isReviewTag,
  RATING_MAX,
  RATING_MIN,
} from "@/lib/api/schemas/review";

/**
 * `POST /reviews` — one review per order item, buyer only, delivered items only.
 *
 * Posted from a plain form, so a review can be left without JavaScript; the
 * star row degrades to radio inputs and the tags to checkboxes.
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

  try {
    await serverApiFetch("/reviews", {
      method: "POST",
      body: {
        orderItemId,
        rating,
        ...(comment ? { comment } : {}),
        ...(tags.length ? { tags } : {}),
      },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/orders/${orderId}`);
  redirect(`${page}?submitted=${rating}&item=${orderItemId}`);
}

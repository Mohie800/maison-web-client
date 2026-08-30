"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { shareWishlist, unshareWishlist } from "@/lib/api/endpoints/wishlist";
import { ApiError } from "@/lib/api/errors";

/**
 * Wishlist mutations, as Server Actions from plain forms.
 *
 * All three are idempotent-ish and failure-tolerant: removing an item that's
 * already gone, or toggling a notification twice, should not put an error in
 * front of someone tidying a list. A genuine failure leaves the row in place
 * and the next render shows the true state.
 */

async function quietly(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    // A 404 means it's already gone — the desired end state either way.
    if (error instanceof ApiError && error.isNotFound) return;
    throw error;
  }
}

function revalidateWishlist(locale: string) {
  revalidatePath(`/${locale}/account/wishlist`);
  revalidatePath(`/${locale}/cart`);
}

export async function removeFromWishlistAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");

  if (listingId) {
    await quietly(() =>
      serverApiFetch(`/wishlist/${listingId}`, { method: "DELETE" }),
    );
    revalidateWishlist(locale);
  }
  redirect(`/${locale}/account/wishlist`);
}

/**
 * Moves the item into the bag in one call — the endpoint removes it from the
 * wishlist as part of the same operation, which is why this isn't an add
 * followed by a delete.
 */
export async function moveToCartAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");

  if (listingId) {
    await quietly(() =>
      serverApiFetch(`/wishlist/${listingId}/move-to-cart`, { method: "POST" }),
    );
    revalidateWishlist(locale);
  }
  redirect(`/${locale}/cart`);
}

/** Toggles the price-drop alert for one saved item. */
export async function toggleNotifyAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const next = formData.get("notify") === "true";

  if (listingId) {
    await quietly(() =>
      // The DTO field is `enabled`, though the row reads back as
      // `notifyOnPriceDrop` — verified against the live endpoint.
      serverApiFetch(`/wishlist/${listingId}/notify`, {
        method: "PATCH",
        body: { enabled: next },
      }),
    );
    revalidateWishlist(locale);
  }
  redirect(`/${locale}/account/wishlist`);
}

/**
 * Publishes the wishlist and lands back on the page with the token in the URL,
 * so the link is visible without a second read — nothing on `GET /wishlist`
 * states whether a list is shared (raised as GAP-81).
 */
export async function shareWishlistAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const { shareToken } = await shareWishlist();
  revalidateWishlist(locale);
  redirect(
    `/${locale}/account/wishlist?share=${encodeURIComponent(shareToken)}`,
  );
}

export async function unshareWishlistAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  await quietly(() => unshareWishlist());
  revalidateWishlist(locale);
  redirect(`/${locale}/account/wishlist?share=off`);
}

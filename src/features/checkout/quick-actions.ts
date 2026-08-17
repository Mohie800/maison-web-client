"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { getAccessToken } from "@/lib/auth/session";

/**
 * "Add to Cart" / "Buy Now" straight from a product card — Figma 651:685.
 *
 * Both are Server Actions posted from a plain form, so the cards work without
 * JavaScript on the homepage, PLP and search results alike.
 *
 * Signed-out visitors are sent to sign-in with a `next` that returns them where
 * they were going, rather than being shown an error for something they can't
 * have known about.
 */
async function addItem(listingId: string): Promise<"ok" | "unauthenticated"> {
  if (!(await getAccessToken())) return "unauthenticated";

  try {
    await serverApiFetch("/bag/items", {
      method: "POST",
      body: { itemType: "listing", refId: listingId },
    });
    return "ok";
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return "unauthenticated";
    }
    throw error;
  }
}

export async function addToBagAction(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!listingId) return;

  const result = await addItem(listingId);
  if (result === "unauthenticated") {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/cart`)}`);
  }

  revalidatePath(`/${locale}/cart`);
  // Stay on the page; the header's cart badge picks up the new count.
  revalidatePath(`/${locale}`);
}

export async function buyNowAction(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!listingId) return;

  const result = await addItem(listingId);
  if (result === "unauthenticated") {
    redirect(
      `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/checkout/shipping`)}`,
    );
  }

  revalidatePath(`/${locale}/cart`);
  redirect(`/${locale}/checkout/shipping`);
}

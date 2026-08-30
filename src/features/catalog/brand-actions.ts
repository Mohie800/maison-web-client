"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";

/**
 * Brand follow / unfollow (GAP-53).
 *
 * Idempotent in both directions server-side, so a double tap can't invent a
 * follower. The response carries the corrected `followersCount`, but the page
 * re-reads anyway — the count on the card has to agree with the rest of the
 * grid, not just with the row that was pressed.
 */
async function setFollow(formData: FormData, method: "POST" | "DELETE") {
  const locale = String(formData.get("locale") ?? "en");
  const brandId = String(formData.get("brandId") ?? "");
  const back = String(formData.get("back") ?? "/brands");

  if (brandId) {
    await serverApiFetch(`/brands/${brandId}/follow`, { method });
    revalidatePath(`/${locale}/brands`);
  }
  redirect(`/${locale}${back}`);
}

export async function followBrandAction(formData: FormData): Promise<void> {
  await setFollow(formData, "POST");
}

export async function unfollowBrandAction(formData: FormData): Promise<void> {
  await setFollow(formData, "DELETE");
}

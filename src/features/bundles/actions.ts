"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";

/**
 * `POST /bag/items` with `itemType: "bundle"` — the whole set goes in as one
 * line, which is what "Add bundle to bag" on `651:5096` means.
 */
export async function addBundleToBagAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const bundleId = String(formData.get("bundleId") ?? "");
  const page = `/${locale}/bundles/${bundleId}`;

  if (!bundleId) redirect(`/${locale}/bundles`);

  try {
    await serverApiFetch("/bag/items", {
      method: "POST",
      body: { itemType: "bundle", refId: bundleId },
    });
  } catch (error) {
    let code = "addFailed";
    if (error instanceof ApiError) {
      const message = error.messages.join(" ");
      if (error.isUnauthorized) code = "unauthenticated";
      else if (/already/i.test(message)) code = "alreadyInBag";
      else if (/available|sold|active/i.test(message)) code = "unavailable";
    }
    redirect(`${page}?error=${code}`);
  }

  revalidatePath(`/${locale}/cart`);
  redirect(`${page}?added=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";

/**
 * Deletes a draft listing.
 *
 * Only drafts can be deleted — the API rejects anything else, so the button is
 * rendered only for drafts and this is a second line of defence rather than the
 * only one. A 404 means it's already gone, which is the desired end state.
 */
export async function deleteListingAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");

  if (id) {
    try {
      await serverApiFetch(`/listings/${id}`, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof ApiError && error.isNotFound)) throw error;
    }
    revalidatePath(`/${locale}/account/listings`);
  }
  redirect(`/${locale}/account/listings`);
}

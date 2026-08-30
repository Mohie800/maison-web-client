"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import {
  CATEGORY_PARAM,
  isNotificationCategory,
} from "@/lib/api/schemas/notification";

/** `POST /notifications/read-all`, optionally scoped to the open tab. */
export async function markAllReadAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const category = String(formData.get("category") ?? "");
  const page = `/${locale}/account/notifications`;

  try {
    await serverApiFetch("/notifications/read-all", {
      method: "POST",
      body: isNotificationCategory(category)
        ? { category: CATEGORY_PARAM[category] }
        : {},
    });
  } catch {
    // Nothing to tell the user: the list re-renders either way, and a failed
    // mark-read leaves the dots where they were.
  }

  revalidatePath(page);
  redirect(isNotificationCategory(category) ? `${page}?tab=${category}` : page);
}

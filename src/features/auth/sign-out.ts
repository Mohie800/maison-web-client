"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSessionCookies } from "@/lib/auth/session";

/**
 * Sign out — the red row at the foot of the account rail (`651:8933`).
 *
 * There was no way to sign out of the app at all until this shipped: the BFF
 * route and the client helper both existed, and nothing rendered either.
 *
 * The API exposes no revoke endpoint, so this clears the cookies and nothing
 * more — the same thing `/api/auth/logout` does, done inline so the rail needs
 * no JavaScript.
 */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  await clearSessionCookies();
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { NOTIFICATION_GROUPS } from "@/lib/api/endpoints/settings";

/**
 * Profile and notification preferences.
 *
 * `PUT /users/me/profile` is declared multipart — it takes a photo — so the
 * text fields are sent as multipart too rather than JSON.
 */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.messages.join(" ");
    if (/email/i.test(message)) return "emailInvalid";
    if (/phone/i.test(message)) return "phoneInvalid";
    if (error.isUnauthorized) return "unauthenticated";
    return "invalid";
  }
  return "requestFailed";
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const page = `/${locale}/account/settings/profile`;

  const first = String(formData.get("firstName") ?? "").trim();
  const last = String(formData.get("lastName") ?? "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");
  if (!fullName) redirect(`${page}?error=nameRequired`);

  const body = new FormData();
  body.set("fullName", fullName);
  const phone = String(formData.get("phone") ?? "").trim();
  if (phone) body.set("phone", phone);

  /*
    The multipart field is `profilePic` — confirmed against the live API on
    2026-08-30, which answers GAP-77. Only forwarded when a file was actually
    chosen: an empty part would ask the server to interpret a zero-byte image.
  */
  const photo = formData.get("profilePic");
  if (photo instanceof File && photo.size > 0) body.set("profilePic", photo);

  try {
    await serverApiFetch("/users/me/profile", { method: "PUT", body });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/settings`);
  revalidatePath(page);
  redirect(`${page}?saved=profile`);
}

/**
 * One switch per category, as the frame draws — the API stores three channels
 * each. Off clears all three; on restores push and email and leaves `sms`
 * alone, since nothing in the design ever offers SMS. plans/09 C37.
 */
export async function saveNotificationsAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const page = `/${locale}/account/settings/profile`;

  const body: Record<string, { push: boolean; email: boolean }> = {};
  for (const group of NOTIFICATION_GROUPS) {
    const on = formData.get(group) === "on";
    body[group] = { push: on, email: on };
  }

  try {
    await serverApiFetch("/users/me/notification-preferences", {
      method: "PATCH",
      body,
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/settings`);
  revalidatePath(page);
  redirect(`${page}?saved=notifications#notifications`);
}

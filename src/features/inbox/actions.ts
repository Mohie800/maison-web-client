"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import { MESSAGE_MAX } from "@/lib/api/schemas/conversation";

/**
 * Messaging actions — `POST /conversations/{id}/messages`, `/read`,
 * `DELETE /conversations/{id}` and `POST /listings/{id}/conversations`.
 *
 * `type: "image"` exists on the send DTO and accepts any `attachmentUrl`
 * without validating it, but nothing on the platform turns a file a user picked
 * into a URL (GAP-72), so only text is sent.
 */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNotFound) return "notFound";
    if (error.isUnauthorized) return "unauthenticated";
    if (/empty|required/i.test(error.messages.join(" "))) return "empty";
    return "sendFailed";
  }
  return "sendFailed";
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const page = `/${locale}/inbox/${id}`;

  if (!id) redirect(`/${locale}/inbox`);

  const body = String(formData.get("body") ?? "").trim();
  // An empty send is a stray Enter, not an error worth a message.
  if (!body) redirect(page);
  if (body.length > MESSAGE_MAX) redirect(`${page}?error=tooLong`);

  try {
    await serverApiFetch(`/conversations/${id}/messages`, {
      method: "POST",
      body: { type: "text", body },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/inbox`);
  revalidatePath(page);
  redirect(page);
}

/** Marks the other side's messages read. Fired when a thread is opened. */
export async function markReadAction(id: string, locale: string) {
  try {
    await serverApiFetch(`/conversations/${id}/read`, { method: "POST" });
    revalidatePath(`/${locale}/inbox`);
  } catch {
    // A failed read receipt must not take the thread down with it.
  }
}

/** Removes the thread from your inbox only — the other participant keeps it. */
export async function deleteConversationAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");

  if (id) {
    try {
      await serverApiFetch(`/conversations/${id}`, { method: "DELETE" });
    } catch (error) {
      redirect(`/${locale}/inbox/${id}?error=${toErrorCode(error)}`);
    }
  }

  revalidatePath(`/${locale}/inbox`);
  redirect(`/${locale}/inbox`);
}

/** "Message seller" from a product page — resumes the thread if one exists. */
export async function startConversationAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!listingId) redirect(`/${locale}/inbox`);

  let created: { id?: string } | null = null;
  try {
    created = await serverApiFetch<{ id?: string }>(
      `/listings/${listingId}/conversations`,
      { method: "POST", body: body ? { body } : {} },
    );
  } catch (error) {
    redirect(`/${locale}/products/${listingId}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/inbox`);
  redirect(created?.id ? `/${locale}/inbox/${created.id}` : `/${locale}/inbox`);
}

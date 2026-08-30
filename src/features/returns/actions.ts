"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { uploadAllMedia } from "@/lib/api/endpoints/media";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import {
  isReturnReason,
  NOTE_MAX,
  requiresPhotos,
} from "@/lib/api/schemas/return";

/** `POST /returns` and `POST /returns/{id}/cancel` — both buyer-only. */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.messages.join(" ");
    if (/photo/i.test(message)) return "photosRequired";
    if (/window|expired|eligible/i.test(message)) return "notEligible";
    if (/same seller|shipment/i.test(message)) return "mixedSellers";
    if (/already/i.test(message)) return "alreadyRequested";
    if (error.isUnauthorized) return "unauthenticated";
    return "requestFailed";
  }
  return "requestFailed";
}

export async function requestReturnAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const page = `/${locale}/account/orders/${orderId}/return`;

  if (!orderId) redirect(`/${locale}/account/orders`);

  const orderItemIds = formData
    .getAll("orderItemIds")
    .map(String)
    .filter(Boolean);
  if (orderItemIds.length === 0) redirect(`${page}?error=itemsRequired`);

  const reason = String(formData.get("reason") ?? "");
  if (!isReturnReason(reason)) redirect(`${page}?error=reasonRequired`);

  const reasonNote = String(formData.get("reasonNote") ?? "").trim();
  if (reasonNote.length > NOTE_MAX) redirect(`${page}?error=noteTooLong`);

  /*
    The three fault reasons need evidence. Uploaded here rather than in the
    browser so the file never needs a token of its own — `POST /media` answers
    with the URL the return then references (GAP-72).
  */
  const chosen = formData
    .getAll("evidencePhotos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (requiresPhotos(reason) && chosen.length === 0) {
    redirect(`${page}?error=photosRequired`);
  }

  let evidencePhotos: string[] = [];
  if (chosen.length > 0) {
    try {
      evidencePhotos = await uploadAllMedia(chosen);
    } catch (error) {
      redirect(`${page}?error=${toErrorCode(error)}`);
    }
    if (requiresPhotos(reason) && evidencePhotos.length === 0) {
      redirect(`${page}?error=uploadFailed`);
    }
  }

  let created: { id?: string } | null = null;
  try {
    created = await serverApiFetch<{ id?: string }>("/returns", {
      method: "POST",
      body: {
        orderItemIds,
        reason,
        ...(reasonNote ? { reasonNote } : {}),
        ...(evidencePhotos.length > 0 ? { evidencePhotos } : {}),
      },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/orders/${orderId}`);
  revalidatePath(`/${locale}/account/returns`);

  redirect(
    created?.id
      ? `/${locale}/account/returns/${created.id}?created=1`
      : `/${locale}/account/returns`,
  );
}

/** POST /returns/{id}/cancel — allowed until the parcel ships back. */
export async function cancelReturnAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const returnId = String(formData.get("returnId") ?? "");
  const page = `/${locale}/account/returns/${returnId}`;

  if (!returnId) redirect(`/${locale}/account/returns`);

  try {
    await serverApiFetch(`/returns/${returnId}/cancel`, { method: "POST" });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(page);
  redirect(`${page}?cancelled=1`);
}

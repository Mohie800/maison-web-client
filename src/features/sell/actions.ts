"use server";

import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { uploadMedia } from "@/lib/api/endpoints/media";
import { ApiError } from "@/lib/api/errors";

/**
 * The sell wizard's server calls — one draft, patched step by step.
 *
 * `POST /listings` takes `categoryId` alone and returns a draft (GAP-73), so
 * the wizard creates one when the seller leaves step 1 and `PATCH`es the fields
 * each later step owns. `POST /listings/{id}/submit` enforces the complete set
 * at the end and names every field still missing in one message, so the wizard
 * can route back to the right step instead of discovering them one at a time.
 *
 * Each step patches only its own fields. `attributes` are validated against the
 * category's track schema on every write, so sending a half-filled set from an
 * earlier step would 400 on data the seller has not been asked for yet.
 */

export type SellResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string; messages: string[] };

export async function createDraftAction(
  categoryId: string,
): Promise<SellResult<{ id: string }>> {
  if (!categoryId) return { ok: false, error: "invalid", messages: [] };
  try {
    const draft = await serverApiFetch<{ id?: string }>("/listings", {
      method: "POST",
      body: { categoryId },
    });
    if (!draft?.id) return { ok: false, error: "requestFailed", messages: [] };
    return { ok: true, id: draft.id };
  } catch (error) {
    return fail(error);
  }
}

/** One step's fields. Called on every advance, so it must stay cheap. */
export async function saveDraftAction(
  id: string,
  body: Record<string, unknown>,
): Promise<SellResult> {
  if (!id) return { ok: false, error: "invalid", messages: [] };
  if (Object.keys(body).length === 0) return { ok: true };
  try {
    await serverApiFetch(`/listings/${id}`, { method: "PATCH", body });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * One file to `POST /media`, whose path the photo step then holds.
 *
 * Uploaded through a Server Action rather than the browser so the file never
 * needs a token of its own, matching the return-evidence path.
 */
export async function uploadPhotoAction(
  formData: FormData,
): Promise<SellResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "invalid", messages: [] };
  }
  try {
    const url = await uploadMedia(file);
    if (!url) return { ok: false, error: "requestFailed", messages: [] };
    return { ok: true, url };
  } catch (error) {
    return fail(error);
  }
}

/** `POST /listings/{id}/photos` — the paths `POST /media` handed back. */
export async function attachPhotosAction(
  id: string,
  urls: string[],
): Promise<SellResult> {
  if (!id || urls.length === 0) return { ok: true };
  try {
    await serverApiFetch(`/listings/${id}/photos`, {
      method: "POST",
      body: { urls },
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * The last step: the two optional extras, then submit.
 *
 * Verification and defects hang off a listing that already exists, so a failure
 * on either is reported without unwinding the draft — the listing stands and
 * the score is recomputed.
 */
export async function submitDraftAction(
  id: string,
  verifiedItems: string[],
  defects: { code: string; description?: string }[],
): Promise<SellResult<{ id: string; status: string }>> {
  if (!id) return { ok: false, error: "invalid", messages: [] };

  if (verifiedItems.length > 0) {
    try {
      await serverApiFetch(`/listings/${id}/verification`, {
        method: "POST",
        body: { verifiedItems },
      });
    } catch {
      // Non-fatal, as above.
    }
  }

  if (defects.length > 0) {
    try {
      await serverApiFetch(`/listings/${id}/defects`, {
        method: "POST",
        body: { defects },
      });
    } catch {
      // Non-fatal, as above.
    }
  }

  let status: string;
  try {
    const submitted = await serverApiFetch<{ status?: string }>(
      `/listings/${id}/submit`,
      { method: "POST" },
    );
    /*
      The confirmation screen reads the status back rather than promising a
      review that may not happen: `LISTINGS_AUTO_APPROVE` is on by default on
      dev, so a submit can come back live (GAP-76).
    */
    status = submitted?.status ?? "pending_review";
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/account/listings");
  return { ok: true, id, status };
}

function fail(error: unknown): {
  ok: false;
  error: string;
  messages: string[];
} {
  if (error instanceof ApiError) {
    return {
      ok: false,
      error: error.isUnauthorized ? "unauthenticated" : "invalid",
      // The API's field errors are specific ("price must be a number"); they
      // are shown as-is because a generic message would hide which field.
      messages: error.messages,
    };
  }
  return { ok: false, error: "requestFailed", messages: [] };
}

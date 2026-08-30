"use server";

import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";

/**
 * Publishing a listing — three calls in order, because the API models them as
 * three: create, set the verification checklist, submit for moderation.
 *
 * Called once from the review step rather than step by step; see
 * features/sell/draft.ts for why the wizard can't persist server-side.
 */

export type PublishResult =
  | { ok: true; id: string; status: string }
  | { ok: false; error: string; messages: string[] };

export async function publishListingAction(
  body: Record<string, unknown>,
  verifiedItems: string[],
  defects: { code: string; description?: string }[],
): Promise<PublishResult> {
  let listing: { id?: string; status?: string };
  try {
    listing = await serverApiFetch<{ id?: string; status?: string }>(
      "/listings",
      { method: "POST", body },
    );
  } catch (error) {
    return fail(error);
  }

  const id = listing?.id;
  if (!id) return { ok: false, error: "requestFailed", messages: [] };

  // Both are optional extras on a listing that already exists — a failure here
  // must not lose the listing, so it is reported without unwinding the create.
  if (verifiedItems.length > 0) {
    try {
      await serverApiFetch(`/listings/${id}/verification`, {
        method: "POST",
        body: { verifiedItems },
      });
    } catch {
      // Non-fatal: the score is recomputed, the listing stands.
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

  /*
   * ⚠️ `POST /listings` returns `status: "live"` — the listing is public the
   * moment it is created, and `/submit` answers "Only draft listings can be
   * submitted" (GAP-76). So submission is attempted only when the API actually
   * gave us a draft, and the confirmation screen reads the status back rather
   * than promising a review that did not happen.
   */
  let status = listing.status ?? "live";
  if (status === "draft") {
    try {
      const submitted = await serverApiFetch<{ status?: string }>(
        `/listings/${id}/submit`,
        { method: "POST" },
      );
      status = submitted?.status ?? "pending_review";
    } catch (error) {
      const failure = fail(error);
      return { ...failure, error: "createdButNotSubmitted" };
    }
  }

  revalidatePath("/account/listings");
  return { ok: true, id, status };
}

function fail(error: unknown): { ok: false; error: string; messages: string[] } {
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

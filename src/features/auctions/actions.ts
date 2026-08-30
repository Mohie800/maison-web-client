"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";

/**
 * Auction mutations, posted from plain forms so bidding works without
 * JavaScript — the countdown needs a client, the bid does not.
 */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.messages.join(" ");
    if (/at least/i.test(message)) return "bidTooLow";
    if (/ended|closed|not live/i.test(message)) return "auctionEnded";
    if (/own listing|your own/i.test(message)) return "ownListing";
    if (/terms|entry/i.test(message)) return "termsRequired";
    if (error.isUnauthorized) return "unauthenticated";
    return "requestFailed";
  }
  return "requestFailed";
}

/**
 * POST /listings/{id}/auction-entry — records `termsAcceptedAt` and takes the
 * entry fee. Idempotent: re-posting returns the original entry unchanged.
 *
 * ⚠️ The API accepts an empty body and never checks that terms were shown, so
 * the checkbox below is enforced here only. Noted as GAP-65 in plans/STATUS.
 */
export async function acceptAuctionTermsAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const terms = `/${locale}/auctions/${listingId}/terms`;

  if (!listingId) redirect(`/${locale}/auctions`);
  if (formData.get("agree") !== "on") redirect(`${terms}?error=mustAgree`);

  try {
    // The endpoint takes no body — the OpenAPI document lists no DTO for it,
    // and it records `termsAcceptedAt` on its own.
    await serverApiFetch(`/listings/${listingId}/auction-entry`, {
      method: "POST",
    });
  } catch (error) {
    redirect(`${terms}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/products/${listingId}`);
  redirect(`/${locale}/products/${listingId}?entered=1`);
}

/** POST /listings/{id}/bids. The amount is validated server-side too. */
export async function placeBidAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const pdp = `/${locale}/products/${listingId}`;

  if (!listingId) redirect(`/${locale}/auctions`);

  const raw = String(formData.get("amount") ?? "").trim();
  const amount = Number(raw);
  if (!raw || !Number.isFinite(amount) || amount <= 0) {
    redirect(`${pdp}?bid=invalid`);
  }

  try {
    await serverApiFetch(`/listings/${listingId}/bids`, {
      method: "POST",
      body: { amount },
    });
  } catch (error) {
    const code = toErrorCode(error);
    // Nothing can read entry state (GAP-67), so a first bid discovers the
    // terms gate here and is sent to accept them rather than shown an error.
    if (code === "termsRequired") {
      redirect(`/${locale}/auctions/${listingId}/terms`);
    }
    redirect(`${pdp}?bid=${code}`);
  }

  revalidatePath(pdp);
  revalidatePath(`/${locale}/account/bids`);
  redirect(`${pdp}?bid=placed&amount=${amount}`);
}

/**
 * POST /listings/{id}/auction-payment/pay — takes no body; the winner, the
 * amount and the window are all settled server-side.
 */
export async function payAuctionAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const page = `/${locale}/auctions/${listingId}/payment`;

  if (!listingId) redirect(`/${locale}/auctions`);

  try {
    await serverApiFetch(`/listings/${listingId}/auction-payment/pay`, {
      method: "POST",
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidatePath(`/${locale}/account/orders`);
  revalidatePath(`/${locale}/account/bids`);
  redirect(`/${locale}/account/orders`);
}

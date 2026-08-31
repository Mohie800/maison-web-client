"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";
import {
  CARRIER_MAX,
  COUNTER_NOTE_MAX,
  TRADE_MESSAGE_MAX,
  TRACKING_MAX,
} from "@/lib/api/schemas/trade";

/**
 * Trade actions — `POST /listings/{id}/trade-requests` and the six verbs on
 * `/trade-requests/{id}`.
 *
 * Every one of them 400s with a message naming the state it refused, e.g.
 * *"Not allowed while the trade is in_transit_to_hub"*. Those are mapped to
 * error codes rather than shown raw, so the copy stays translated.
 */

function toErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.messages.join(" ");
    if (/not allowed while|current state/i.test(message)) return "wrongState";
    if (/address/i.test(message)) return "addressRequired";
    if (/own listing|your own/i.test(message)) return "ownListing";
    if (/expired/i.test(message)) return "expired";
    if (/already/i.test(message)) return "alreadyResponded";
    if (error.isNotFound) return "notFound";
    if (error.isUnauthorized) return "unauthenticated";
    return "requestFailed";
  }
  return "requestFailed";
}

function revalidateTrade(locale: string, id?: string) {
  revalidatePath(`/${locale}/trade`);
  revalidatePath(`/${locale}/account/trades`);
  if (id) revalidatePath(`/${locale}/account/trades/${id}`);
}

export async function createTradeRequestAction(
  formData: FormData,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");
  const page = `/${locale}/trade/offer/${listingId}`;

  if (!listingId) redirect(`/${locale}/trade`);

  const offeredListingIds = formData
    .getAll("offeredListingIds")
    .map(String)
    .filter(Boolean);
  if (offeredListingIds.length === 0) redirect(`${page}?error=itemsRequired`);

  const addressId = String(formData.get("addressId") ?? "").trim();

  const message = String(formData.get("note") ?? "").trim();
  if (message.length > TRADE_MESSAGE_MAX) {
    redirect(`${page}?error=noteTooLong`);
  }

  let created: { id?: string } | null = null;
  try {
    created = await serverApiFetch<{ id?: string }>(
      `/listings/${listingId}/trade-requests`,
      {
        method: "POST",
        body: {
          offeredListingIds,
          ...(addressId ? { addressId } : {}),
          ...(message ? { message } : {}),
        },
      },
    );
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidateTrade(locale);
  // Web_Trade_OfferSent — the confirmation needs the created request to render.
  redirect(
    created?.id
      ? `/${locale}/trade/sent/${created.id}`
      : `/${locale}/account/trades?tab=sent&sent=1`,
  );
}

/** The target listing's owner replaces the auto-calculated cash difference. */
export async function counterTradeAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const page = `/${locale}/account/trades/${id}`;

  if (!id) redirect(`/${locale}/account/trades`);

  // Signed since Round 6: positive is the requester paying, negative is us.
  const raw = String(formData.get("amount") ?? "").trim();
  const amount = raw === "" ? null : Number(raw);
  if (amount !== null && !Number.isFinite(amount)) {
    redirect(`${page}?error=amountInvalid`);
  }

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > COUNTER_NOTE_MAX) redirect(`${page}?error=noteTooLong`);

  try {
    await serverApiFetch(`/trade-requests/${id}/counter`, {
      method: "POST",
      // Omitting `amount` keeps the auto difference; 0 is a deliberate even swap.
      body: {
        ...(amount === null ? {} : { amount }),
        ...(note ? { note } : {}),
      },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidateTrade(locale, id);
  redirect(`${page}?countered=1`);
}

export async function acceptTradeAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const page = `/${locale}/account/trades/${id}`;

  if (!id) redirect(`/${locale}/account/trades`);

  const addressId = String(formData.get("addressId") ?? "").trim();

  try {
    await serverApiFetch(`/trade-requests/${id}/accept`, {
      method: "POST",
      body: addressId ? { addressId } : {},
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidateTrade(locale, id);
  redirect(`${page}?accepted=1`);
}

async function simpleAction(
  formData: FormData,
  verb: "decline" | "cancel" | "confirm-receipt",
  done: string,
): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const page = `/${locale}/account/trades/${id}`;

  if (!id) redirect(`/${locale}/account/trades`);

  try {
    await serverApiFetch(`/trade-requests/${id}/${verb}`, { method: "POST" });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidateTrade(locale, id);
  redirect(`${page}?${done}=1`);
}

export async function declineTradeAction(formData: FormData): Promise<void> {
  return simpleAction(formData, "decline", "declined");
}

export async function cancelTradeAction(formData: FormData): Promise<void> {
  return simpleAction(formData, "cancel", "cancelled");
}

export async function confirmReceiptAction(formData: FormData): Promise<void> {
  return simpleAction(formData, "confirm-receipt", "confirmed");
}

/** Marks your leg as dispatched to the hub. Both parties ship separately. */
export async function shipTradeAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const page = `/${locale}/account/trades/${id}`;

  if (!id) redirect(`/${locale}/account/trades`);

  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  if (carrier.length > CARRIER_MAX || trackingNumber.length > TRACKING_MAX) {
    redirect(`${page}?error=trackingTooLong`);
  }

  try {
    await serverApiFetch(`/trade-requests/${id}/ship`, {
      method: "POST",
      body: {
        ...(carrier ? { carrier } : {}),
        ...(trackingNumber ? { trackingNumber } : {}),
      },
    });
  } catch (error) {
    redirect(`${page}?error=${toErrorCode(error)}`);
  }

  revalidateTrade(locale, id);
  redirect(`${page}?shipped=1`);
}

/** Dismisses one pairing so it stops resurfacing on the hub. */
export async function skipSuggestionAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const listingId = String(formData.get("listingId") ?? "");

  if (listingId) {
    try {
      await serverApiFetch(`/trade/suggestions/${listingId}/skip`, {
        method: "POST",
      });
    } catch {
      // A skip that fails is not worth an error page — the card stays put.
    }
  }

  revalidatePath(`/${locale}/trade`);
}

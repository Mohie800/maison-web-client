"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { serverApiFetch } from "@/lib/api/server";
import type { ShipmentTransition } from "@/lib/api/schemas/shipment";

/**
 * Advances a shipment — `PATCH /orders/shipments/{id}/status`.
 *
 * Forward-only: there is no way back from `packed`, so the button is rendered
 * only for the one transition `nextTransition()` says is legal. The tracking
 * fields the DTO accepts are not sent from the list; the detail screen collects
 * them.
 */
export async function advanceShipmentAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ShipmentTransition;

  if (!id || !status) return;

  await serverApiFetch(`/orders/shipments/${id}/status`, {
    method: "PATCH",
    body: { status },
  });

  revalidatePath(`/${locale}/vendor/orders`);
  revalidatePath(`/${locale}/vendor`);
}

/**
 * Posts the seller's public reply — `POST /sellers/reviews/{id}/reply`.
 *
 * One reply per review, and the API has no edit or delete for it, so the form
 * is hidden once `sellerReply` is set rather than pre-filled.
 */
export async function replyToReviewAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();

  if (!id || !reply) return;

  await serverApiFetch(`/sellers/reviews/${id}/reply`, {
    method: "POST",
    body: { reply },
  });

  /* Next 16 requires a profile; the one-arg form is deprecated. "max" gives
     stale-while-revalidate, which is right for a public seller page. */
  revalidateTag("sellers", "max");
  revalidatePath(`/${locale}/vendor/reviews`);
}

/** Shared by create and edit — both send the same body. */
function readDiscount(formData: FormData) {
  const num = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  return {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    discountType: String(formData.get("discountType") ?? "percentage"),
    /* free_shipping ignores the value, but the DTO still requires a number. */
    discountValue: Number(formData.get("discountValue") ?? 0) || 0,
    minOrderAmount: num("minOrderAmount"),
    usageLimit: num("usageLimit"),
    startsAt: String(formData.get("startsAt") ?? "") || undefined,
    expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
  };
}

export async function createDiscountAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  await serverApiFetch("/vendor-portal/discounts", {
    method: "POST",
    body: readDiscount(formData),
  });
  revalidatePath(`/${locale}/vendor/discounts`);
  redirect(`/${locale}/vendor/discounts`);
}

export async function updateDiscountAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await serverApiFetch(`/vendor-portal/discounts/${id}`, {
    method: "PATCH",
    body: readDiscount(formData),
  });
  revalidatePath(`/${locale}/vendor/discounts`);
  redirect(`/${locale}/vendor/discounts`);
}

export async function deleteDiscountAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await serverApiFetch(`/vendor-portal/discounts/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError && error.isNotFound)) throw error;
  }
  revalidatePath(`/${locale}/vendor/discounts`);
}

/**
 * Store details — `PUT /users/me/profile`, which is multipart.
 *
 * Round 9 opened the whole form (GAP-116): the storefront fields save alongside
 * the account ones. Empty strings are still sent, so a seller can clear a bio;
 * only the numeric fields are dropped when blank, since the DTO wants a number
 * or nothing.
 */
export async function saveStoreAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const page = `/${locale}/vendor/store/edit`;

  const body = new FormData();
  const name = String(formData.get("fullName") ?? "").trim();
  if (!name) redirect(`${page}?error=1`);
  body.set("fullName", name);

  for (const field of ["username", "city", "bio", "aboutText", "shipsFromCity", "bannerUrl"]) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) body.set(field, value);
  }

  /* Comma-separated in the form, a JSON array on the wire. */
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length) body.set("tags", JSON.stringify(tags));

  for (const field of ["freeShippingThreshold", "returnWindowDays"]) {
    const raw = String(formData.get(field) ?? "").trim();
    if (raw && Number.isFinite(Number(raw))) body.set(field, raw);
  }
  body.set("returnsAccepted", formData.get("returnsAccepted") ? "true" : "false");

  try {
    await serverApiFetch("/users/me/profile", { method: "PUT", body });
  } catch {
    redirect(`${page}?error=1`);
  }

  revalidateTag("sellers", "max");
  revalidatePath(`/${locale}/vendor/store`);
  redirect(`/${locale}/vendor/store`);
}

/**
 * Withdraws a live listing — `POST /listings/{id}/withdraw`.
 *
 * **One-way.** The frame calls this "Pause Listing", but there is no resume:
 * `POST /listings/{id}/submit` answers "Only draft listings can be submitted",
 * so a withdrawn listing can never go live again (GAP-117). The button is
 * labelled and styled for what it actually does.
 */
export async function withdrawListingAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await serverApiFetch(`/listings/${id}/withdraw`, { method: "POST" });

  revalidatePath(`/${locale}/vendor/products`);
  revalidatePath(`/${locale}/vendor/products/${id}`);
}

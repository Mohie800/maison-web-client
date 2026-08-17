"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { parseResponse } from "@/lib/api/parse";
import { ApiError } from "@/lib/api/errors";
import {
  couponValidationSchema,
  orderSchema,
  type CouponValidation,
  type ShipmentSelection,
} from "@/lib/api/schemas/checkout";

/**
 * Cart and checkout mutations as Server Actions.
 *
 * These are progressive-enhancement forms: each one is a `<form action={…}>`, so
 * the cart works without JavaScript and there's no client-side API layer to keep
 * in sync. They run on the server, so the session cookie is read directly rather
 * than round-tripping through the BFF proxy.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toResult(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    return { ok: false, error: error.message };
  }
  console.error("[checkout] unexpected error", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/* ----------------------------------------------------------------- bag */

export async function addToBag(
  itemType: "listing" | "bundle",
  refId: string,
): Promise<ActionResult> {
  try {
    await serverApiFetch("/bag/items", {
      method: "POST",
      body: { itemType, refId },
    });
    revalidatePath("/cart");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function removeBagItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await serverApiFetch(`/bag/items/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("[checkout] removeBagItem", error);
  }
  revalidatePath("/cart");
}

/**
 * Toggles whether an item is included in checkout.
 *
 * The bag has per-item selection (`PATCH /bag/items/{id}/select`) and
 * `GET /bag` reports `selectedTotal` separately from `total`, so the cart needs
 * real checkboxes — not a list where everything is implicitly bought.
 */
export async function toggleBagItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await serverApiFetch(`/bag/items/${id}/select`, { method: "PATCH" });
  } catch (error) {
    console.error("[checkout] toggleBagItem", error);
  }
  revalidatePath("/cart");
}

export async function clearBag(): Promise<void> {
  try {
    await serverApiFetch("/bag", { method: "DELETE" });
  } catch (error) {
    console.error("[checkout] clearBag", error);
  }
  revalidatePath("/cart");
}

/* ------------------------------------------------------------ addresses */

export async function createAddress(formData: FormData): Promise<void> {
  const body = {
    label: str(formData, "label"),
    recipientName: str(formData, "recipientName"),
    phone: str(formData, "phone"),
    country: str(formData, "country") || "SA",
    city: str(formData, "city"),
    area: str(formData, "area"),
    street: str(formData, "street"),
    building: str(formData, "building"),
    apartment: str(formData, "apartment"),
    postalCode: str(formData, "postalCode"),
    isDefault: formData.get("isDefault") === "on",
  };

  await serverApiFetch("/addresses", { method: "POST", body });
  revalidatePath("/checkout/shipping");
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await serverApiFetch(`/addresses/${id}/default`, { method: "PATCH" });
  revalidatePath("/checkout/shipping");
}

/* ------------------------------------------------------- payment methods */

export async function addPaymentMethod(formData: FormData): Promise<void> {
  const type = str(formData, "type") || "card";

  /**
   * Card details are transient — the API tokenizes server-side and the docs
   * state the number and CVV are never stored. They are passed straight through
   * and never logged or persisted here either.
   */
  const body: Record<string, unknown> = { type, isDefault: true };

  if (type === "card" || type === "mada") {
    body.cardNumber = str(formData, "cardNumber").replace(/\s+/g, "");
    body.cardholderName = str(formData, "cardholderName");
    body.expiryMonth = Number(str(formData, "expiryMonth"));
    body.expiryYear = Number(str(formData, "expiryYear"));
    body.cvv = str(formData, "cvv");
  } else if (type === "stc_pay") {
    body.walletPhone = str(formData, "walletPhone");
  }

  await serverApiFetch("/payment-methods", { method: "POST", body });
  revalidatePath("/checkout/payment");
}

export async function removePaymentMethod(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await serverApiFetch(`/payment-methods/${id}`, { method: "DELETE" });
  revalidatePath("/checkout/payment");
}

/* ---------------------------------------------------------------- coupon */

export async function validateCoupon(
  code: string,
  orderSubtotal: number,
): Promise<CouponValidation | null> {
  try {
    const data = await serverApiFetch<unknown>("/coupons/validate", {
      method: "POST",
      body: { code, orderSubtotal },
    });
    return parseResponse(
      couponValidationSchema,
      data,
      "POST /coupons/validate",
    );
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- checkout */

/**
 * Places the order.
 *
 * Multi-seller by design: one bag can produce several orders, and `shipments`
 * carries a shipping choice per seller group. The redirect on success is
 * deliberate — it makes the browser leave the POST, so a refresh can't
 * resubmit the order.
 */
export async function placeOrder(formData: FormData): Promise<void> {
  const addressId = str(formData, "addressId");
  const paymentMethodId = str(formData, "paymentMethodId");
  const couponCode = str(formData, "couponCode");
  const charityId = str(formData, "charityId");
  const donationAmount = Number(str(formData, "donationAmount") || "0");

  let shipments: ShipmentSelection[] = [];
  try {
    shipments = JSON.parse(str(formData, "shipments") || "[]");
  } catch {
    shipments = [];
  }

  const order = await serverApiFetch<unknown>("/orders/checkout", {
    method: "POST",
    body: {
      addressId,
      shipments,
      ...(paymentMethodId ? { paymentMethodId } : {}),
      ...(couponCode ? { couponCode } : {}),
      ...(donationAmount > 0 && charityId
        ? { donationAmount, charityId }
        : {}),
    },
  });

  /**
   * Checkout can create multiple orders (one per seller). The response shape
   * isn't documented, so both a single object and an array are handled.
   */
  const parsed = Array.isArray(order)
    ? orderSchema.array().safeParse(order)
    : orderSchema.safeParse(order);

  const orderId = parsed.success
    ? Array.isArray(parsed.data)
      ? parsed.data[0]?.id
      : parsed.data.id
    : undefined;

  revalidatePath("/cart");
  revalidatePath("/account/orders");

  redirect(orderId ? `/checkout/confirmed/${orderId}` : "/account/orders");
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

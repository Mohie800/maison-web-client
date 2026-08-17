import "server-only";
import { z } from "zod";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  addressSchema,
  bagSchema,
  charitySchema,
  checkoutPreviewSchema,
  paymentMethodSchema,
  shippingOptionSchema,
  type Address,
  type Bag,
  type Charity,
  type CheckoutPreview,
  type PaymentMethod,
  type ShipmentSelection,
  type ShippingOption,
} from "../schemas/checkout";

/**
 * Server-side reads for the cart and checkout.
 *
 * All authenticated and user-specific, so nothing here is cached. Mutations run
 * through Server Actions (features/checkout/actions.ts) so the cart updates
 * without shipping the whole flow to the client.
 */

export async function getBag(): Promise<Bag> {
  const data = await serverApiFetch<unknown>("/bag");
  return parseResponse(bagSchema, data, "GET /bag");
}

export async function getAddresses(): Promise<Address[]> {
  const data = await serverApiFetch<unknown>("/addresses");
  return parseResponse(z.array(addressSchema), data, "GET /addresses");
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await serverApiFetch<unknown>("/payment-methods");
  return parseResponse(
    z.array(paymentMethodSchema),
    data,
    "GET /payment-methods",
  );
}

export async function getShippingOptions(): Promise<ShippingOption[]> {
  const data = await serverApiFetch<unknown>("/shipping-options", {
    cache: "force-cache",
    next: { revalidate: 3600, tags: ["shipping-options"] },
  });
  return parseResponse(
    z.array(shippingOptionSchema),
    data,
    "GET /shipping-options",
  );
}

export async function getCharities(): Promise<Charity[]> {
  const data = await serverApiFetch<unknown>("/charities", {
    cache: "force-cache",
    next: { revalidate: 3600, tags: ["charities"] },
  });
  return parseResponse(z.array(charitySchema), data, "GET /charities");
}

export interface PreviewInput {
  addressId?: string;
  bagItemIds?: string[];
  shipments?: ShipmentSelection[];
  couponCode?: string;
  donationAmount?: number;
  charityId?: string;
}

/**
 * The single source of truth for what the buyer will be charged.
 *
 * Every total shown in the UI comes from here. Nothing is added up client-side:
 * VAT is 15% of (subtotal + shipping), discounts and per-seller shipping
 * interact, and duplicating that arithmetic in the browser is how a checkout
 * ends up displaying a different number than it charges.
 */
export async function previewCheckout(
  input: PreviewInput,
): Promise<CheckoutPreview> {
  const data = await serverApiFetch<unknown>("/orders/checkout/preview", {
    method: "POST",
    body: input,
  });
  return parseResponse(
    checkoutPreviewSchema,
    data,
    "POST /orders/checkout/preview",
  );
}

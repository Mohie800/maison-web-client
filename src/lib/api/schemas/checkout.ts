import { z } from "zod";
import { listingSchema } from "./listing";

/**
 * Cart and checkout contracts, all verified against the live API on 2026-08-17
 * and re-checked 2026-08-29. Request DTOs are in the OpenAPI spec; responses
 * still are not (API-05), so every response shape here is observed rather than
 * documented.
 *
 * Money in this area comes back as **numbers**, not the decimal strings used by
 * `/listings`. Normalised to strings here so the rest of the app has one rule:
 * money is text, and totals only ever come from the server.
 */
const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? null : String(v)));

/* ------------------------------------------------------------------- bag */

export const bagItemSchema = z.object({
  id: z.string(),
  itemType: z.enum(["listing", "bundle"]),
  listingId: z.string().nullish(),
  bundleId: z.string().nullish(),
  /** Price captured when the item was added — may differ from the live price. */
  priceSnapshot: money,
  /** Per-item checkout selection: the cart has checkboxes, not just a list. */
  selected: z.boolean(),
  createdAt: z.string().nullish(),
  listing: listingSchema.nullish(),
});

export type BagItem = z.infer<typeof bagItemSchema>;

export const bagSchema = z.object({
  items: z.array(bagItemSchema),
  total: money,
  /** Total of selected items only — what checkout will actually charge. */
  selectedTotal: money,
});

export type Bag = z.infer<typeof bagSchema>;

/* --------------------------------------------------------------- address */

export const addressSchema = z.object({
  id: z.string(),
  label: z.string().nullish(),
  recipientName: z.string(),
  phone: z.string(),
  country: z.string(),
  city: z.string(),
  area: z.string().nullish(),
  street: z.string(),
  building: z.string().nullish(),
  apartment: z.string().nullish(),
  postalCode: z.string().nullish(),
  isDefault: z.boolean().nullish(),
});

export type Address = z.infer<typeof addressSchema>;

/* -------------------------------------------------------- payment method */

/**
 * The API supports far more than cards — this corrects our earlier assumption.
 * `mada` (the Saudi domestic network) and `stc_pay` are both first-class.
 */
export const PAYMENT_TYPES = [
  "card",
  "mada",
  "stc_pay",
  "apple_pay",
  "tabby",
  "tamara",
  "paytabs",
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Types that carry card details rather than a wallet phone or redirect. */
export const CARD_PAYMENT_TYPES: PaymentType[] = ["card", "mada"];

/**
 * Checkout and the wallet read the same `GET /payment-methods`, so they share
 * one schema. This file used to carry its own copy declaring `brand` and
 * `last4`; the API sends **`cardBrand`** and **`cardLast4`**, so both were
 * always null and the saved-card row could never show "Visa •••• 4242".
 * Verified against a real saved card on 2026-08-29.
 */
export {
  paymentMethodSchema,
  type PaymentMethod,
} from "./wallet";

/* -------------------------------------------------------- shipping option */

export const shippingOptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  nameEn: z.string().nullish(),
  nameAr: z.string().nullish(),
  price: money,
  etaMinDays: z.number().nullish(),
  etaMaxDays: z.number().nullish(),
  isPickup: z.boolean().nullish(),
  isTracked: z.boolean().nullish(),
});

export type ShippingOption = z.infer<typeof shippingOptionSchema>;

/* -------------------------------------------------------------- preview */

export const sellerGroupSchema = z.object({
  sellerId: z.string(),
  /** Comes back empty today — see API-25. */
  sellerName: z.string().nullish(),
  items: z.array(
    z.object({
      bagItemId: z.string(),
      listingId: z.string().nullish(),
      bundleId: z.string().nullish(),
      title: z.string(),
      price: money,
    }),
  ),
  availableShippingOptions: z.array(shippingOptionSchema),
  chosenShippingOptionId: z.string().nullish(),
  subtotal: money,
  /** What the buyer is charged for this parcel — 0 when the seller absorbs it. */
  shippingAmount: money,
  /**
   * GAP-45. `included_in_price` only when *every* line in the group says so: a
   * parcel has one shipping charge and can't half-absorb it, and a bundle line
   * whose listing can't be resolved counts as not absorbed.
   */
  shippingPayer: z.string().nullish(),
  /** What the parcel costs to send, whoever pays — the value being covered. */
  parcelShippingAmount: money,
});

export type SellerGroup = z.infer<typeof sellerGroupSchema>;

/**
 * The authoritative totals. VAT is 15% of (subtotal + shipping), computed
 * server-side — never recomputed here.
 */
export const checkoutPreviewSchema = z.object({
  sellerGroups: z.array(sellerGroupSchema),
  subtotalAmount: money,
  shippingAmount: money,
  vatAmount: money,
  discountAmount: money,
  donationAmount: money,
  totalAmount: money,
  /** Round-up suggestion for the Ehsan charity donation. */
  suggestedDonationAmount: money,
  currency: z.string().nullish(),
});

export type CheckoutPreview = z.infer<typeof checkoutPreviewSchema>;

/** `ShipmentSelectionDto` — both fields required; the spec documents it now. */
export interface ShipmentSelection {
  sellerId: string;
  shippingOptionId: string;
}

export const couponValidationSchema = z.object({
  valid: z.boolean(),
  discountAmount: money,
  freeShipping: z.boolean().nullish(),
  message: z.string().nullish(),
});

export type CouponValidation = z.infer<typeof couponValidationSchema>;

export const charitySchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().nullish(),
});

export type Charity = z.infer<typeof charitySchema>;

export const orderSchema = z
  .object({
    id: z.string(),
    status: z.string().nullish(),
    totalAmount: money,
    currency: z.string().nullish(),
    createdAt: z.string().nullish(),
  })
  .passthrough();

export type Order = z.infer<typeof orderSchema>;

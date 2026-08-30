/**
 * The sell wizard's working state.
 *
 * ⚠️ This is held in the browser, not on the server, because the API cannot
 * store a partial listing. `POST /listings` **requires** `categoryId`, `title`,
 * `condition`, `attributes` and `price` — data the wizard does not have until
 * step 7 — so there is no draft to create at step 1 and nothing to PATCH
 * through steps 2–8. plans/04 describes a server-persisted draft; that plan
 * predates the contract and is not buildable (GAP-73). Recorded as plans/09 C36.
 *
 * The listing is created once, on the final step, and submitted immediately
 * after. `sessionStorage` keeps the work across a refresh.
 */

export const SELL_STEPS = [
  "category",
  "type",
  "details",
  "condition",
  "photos",
  "authenticity",
  "pricing",
  "shipping",
  "review",
] as const;

export type SellStep = (typeof SELL_STEPS)[number];

/** `GET /lookups/*` — mirrored so a step can be typed without a round trip. */
export const SALE_MODES = ["fixed", "negotiable", "auction"] as const;
export const CONDITIONS = [
  "new",
  "new_with_tags",
  "new_without_tags",
  "like_new",
  "good",
  "fair",
] as const;
export const SPECIAL_TAGS = ["limited_edition", "authentic", "luxury"] as const;
export const FULFILLMENT_METHODS = [
  "shipping_only",
  "pickup_in_person",
  "both",
] as const;
export const SHIPPING_PAYERS = [
  "buyer_pays",
  "included_in_price",
  "to_be_agreed",
] as const;
export const AUCTION_DURATIONS = [24, 48, 72] as const;
export const CITIES = [
  "Riyadh",
  "Jeddah",
  "Dammam",
  "Mecca",
  "Medina",
  "Khobar",
  "Tabuk",
  "Other",
] as const;

/** `SetVerificationDto.verifiedItems` — step 6's checklist. */
export const VERIFICATION_ITEMS = [
  "receipt_invoice",
  "authentication_tag",
  "original_box",
  "brand_label",
  "serial_code",
  "dust_bag_accessories",
] as const;

export const TITLE_MAX = 140;
export const DESCRIPTION_MAX = 500;

/**
 * `CreateListingDto.imagesBase64` caps at 5, while `POST /listings/{id}/photos`
 * wants 3–10 URLs and nothing produces a URL from a file the seller picked.
 * Five is therefore the real ceiling, not ten (GAP-74).
 */
export const PHOTOS_MIN = 3;
export const PHOTOS_MAX = 5;

export interface SellDraft {
  categoryId: string | null;
  /** Kept only to redraw the chips; the API is sent the leaf id. */
  topCategoryId: string | null;
  saleMode: (typeof SALE_MODES)[number];
  tradeEnabled: boolean;
  title: string;
  description: string;
  brandId: string | null;
  attributes: Record<string, string | string[]>;
  condition: (typeof CONDITIONS)[number] | null;
  /** `DefectItemDto` — `code` is required, `description` optional. */
  defects: { code: string; description?: string }[];
  /** Data URIs — what `imagesBase64` takes. First is the cover. */
  photos: string[];
  verifiedItems: string[];
  price: string;
  originalPrice: string;
  quantity: string;
  startingBid: string;
  reservePrice: string;
  auctionDurationHours: number;
  specialTags: string[];
  fulfillmentMethod: (typeof FULFILLMENT_METHODS)[number];
  shippingPayer: (typeof SHIPPING_PAYERS)[number];
  city: (typeof CITIES)[number];
}

export const EMPTY_DRAFT: SellDraft = {
  categoryId: null,
  topCategoryId: null,
  saleMode: "fixed",
  tradeEnabled: false,
  title: "",
  description: "",
  brandId: null,
  attributes: {},
  condition: null,
  defects: [],
  photos: [],
  verifiedItems: [],
  price: "",
  originalPrice: "",
  quantity: "1",
  startingBid: "",
  reservePrice: "",
  auctionDurationHours: 24,
  specialTags: [],
  fulfillmentMethod: "shipping_only",
  shippingPayer: "buyer_pays",
  city: "Riyadh",
};

/** What each step needs before Continue is allowed. */
export function stepComplete(step: SellStep, draft: SellDraft): boolean {
  switch (step) {
    case "category":
      return Boolean(draft.categoryId);
    case "type":
      return true;
    case "details":
      return draft.title.trim().length > 0;
    case "condition":
      return Boolean(draft.condition);
    case "photos":
      return draft.photos.length >= PHOTOS_MIN;
    case "authenticity":
      return true;
    case "pricing":
      return draft.saleMode === "auction"
        ? Number(draft.startingBid) > 0 && Number(draft.price) > 0
        : Number(draft.price) > 0;
    case "shipping":
      return true;
    case "review":
      return true;
  }
}

const num = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** The draft as `CreateListingDto`. */
export function toCreateBody(draft: SellDraft): Record<string, unknown> {
  const auction = draft.saleMode === "auction";
  return {
    categoryId: draft.categoryId,
    title: draft.title.trim(),
    condition: draft.condition,
    attributes: draft.attributes,
    price: num(draft.price) ?? 0,
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.brandId ? { brandId: draft.brandId } : {}),
    ...(num(draft.originalPrice) ? { originalPrice: num(draft.originalPrice) } : {}),
    ...(num(draft.quantity) ? { quantity: num(draft.quantity) } : {}),
    isNegotiable: draft.saleMode === "negotiable",
    auctionEnabled: auction,
    tradeEnabled: draft.tradeEnabled,
    ...(auction
      ? {
          startingBid: num(draft.startingBid),
          ...(num(draft.reservePrice) ? { reservePrice: num(draft.reservePrice) } : {}),
          auctionDurationHours: draft.auctionDurationHours,
        }
      : {}),
    ...(draft.specialTags.length ? { specialTags: draft.specialTags } : {}),
    fulfillmentMethod: draft.fulfillmentMethod,
    shippingPayer: draft.shippingPayer,
    city: draft.city,
    ...(draft.photos.length ? { imagesBase64: draft.photos } : {}),
  };
}

/** `GET /lookups/category-types`. */
export const CATEGORY_TYPES = [
  "fashion",
  "electronics",
  "furniture",
  "toys_art",
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

/**
 * Which type a top-level category belongs to.
 *
 * Derived from the slug because **no category carries its type** — the field
 * does not exist on the category at all (GAP-75), and step 3 needs it to ask
 * `GET /lookups/track-schema/{type}` for the right fields. Three of the nine
 * roots name their type; everything else is fashion, which is what the six
 * remaining roots (women, men, kids, shoes, bags, accessories) are.
 */
export function categoryTypeForSlug(slug: string): CategoryType {
  if (slug === "electronics") return "electronics";
  if (slug === "furniture") return "furniture";
  if (slug === "toys-art") return "toys_art";
  return "fashion";
}

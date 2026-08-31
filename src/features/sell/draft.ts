/**
 * The sell wizard's working state.
 *
 * The draft lives on the server. `POST /listings` takes `categoryId` alone and
 * returns a draft (GAP-73, answered in Round 5), so the wizard creates one when
 * the seller leaves step 1 and `PATCH`es each later step's fields as it goes.
 * `POST /listings/{id}/submit` enforces the complete set at the end. plans/04
 * describes exactly this and is buildable as written.
 *
 * This state is the in-flight copy the steps edit; the id in `?draft=` is what
 * survives a refresh, and the wizard rehydrates from `GET /listings/{id}`.
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
export const PHOTOS_MAX = 10;

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
  /** `/uploads/media/…` paths from `POST /media`. First is the cover. */
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
    ...(draft.description.trim()
      ? { description: draft.description.trim() }
      : {}),
    ...(draft.brandId ? { brandId: draft.brandId } : {}),
    ...(num(draft.originalPrice)
      ? { originalPrice: num(draft.originalPrice) }
      : {}),
    ...(num(draft.quantity) ? { quantity: num(draft.quantity) } : {}),
    isNegotiable: draft.saleMode === "negotiable",
    auctionEnabled: auction,
    tradeEnabled: draft.tradeEnabled,
    ...(auction
      ? {
          startingBid: num(draft.startingBid),
          ...(num(draft.reservePrice)
            ? { reservePrice: num(draft.reservePrice) }
            : {}),
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

/**
 * What each step writes, so a `PATCH` only ever carries fields the seller has
 * actually been asked for.
 *
 * `attributes` are re-validated against the category's track schema on every
 * write, so sending a half-filled set from an earlier step would 400 on data
 * the wizard has not collected yet. Hence per-step bodies rather than one
 * accumulated one.
 *
 * `category` is absent: `categoryId` goes on the create. `photos`,
 * `authenticity` and `review` write through their own endpoints.
 */
export function stepPatchBody(
  step: SellStep,
  draft: SellDraft,
): Record<string, unknown> {
  const auction = draft.saleMode === "auction";
  switch (step) {
    case "type":
      // `tradeEnabled` resolves `saleMode` on the server, as it does on create.
      return {
        isNegotiable: draft.saleMode === "negotiable",
        auctionEnabled: auction,
        tradeEnabled: draft.tradeEnabled,
      };
    case "details":
      return {
        title: draft.title.trim(),
        attributes: draft.attributes,
        ...(draft.description.trim()
          ? { description: draft.description.trim() }
          : {}),
        ...(draft.brandId ? { brandId: draft.brandId } : {}),
      };
    case "condition":
      return { condition: draft.condition };
    case "pricing":
      return {
        price: num(draft.price) ?? 0,
        ...(num(draft.originalPrice)
          ? { originalPrice: num(draft.originalPrice) }
          : {}),
        ...(num(draft.quantity) ? { quantity: num(draft.quantity) } : {}),
        ...(auction
          ? {
              startingBid: num(draft.startingBid),
              ...(num(draft.reservePrice)
                ? { reservePrice: num(draft.reservePrice) }
                : {}),
              auctionDurationHours: draft.auctionDurationHours,
            }
          : {}),
        ...(draft.specialTags.length ? { specialTags: draft.specialTags } : {}),
      };
    case "shipping":
      return {
        fulfillmentMethod: draft.fulfillmentMethod,
        shippingPayer: draft.shippingPayer,
        city: draft.city,
      };
    default:
      return {};
  }
}

/**
 * A draft read back from `GET /listings/{id}` into the shape the steps edit.
 * Every field is optional on a draft, so each falls back to the empty value.
 */
export function fromListing(
  listing: Record<string, unknown>,
  topCategoryId: string,
): SellDraft {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const money = (v: unknown) =>
    v == null ? "" : typeof v === "number" ? String(v) : str(v);
  const photos = Array.isArray(listing.photos)
    ? (listing.photos as { url?: string }[])
        .map((photo) => photo?.url)
        .filter((url): url is string => Boolean(url))
    : [];

  return {
    ...EMPTY_DRAFT,
    categoryId: str(listing.categoryId) || null,
    topCategoryId,
    title: str(listing.title),
    description: str(listing.description),
    brandId: str(listing.brandId) || null,
    attributes:
      listing.attributes && typeof listing.attributes === "object"
        ? (listing.attributes as SellDraft["attributes"])
        : {},
    condition: (str(listing.condition) || null) as SellDraft["condition"],
    photos,
    saleMode: listing.auctionEnabled
      ? "auction"
      : listing.isNegotiable
        ? "negotiable"
        : "fixed",
    // Input only — the server folds it into `saleMode` and stores no column.
    tradeEnabled: str(listing.saleMode) === "trade",
    price: money(listing.price),
    originalPrice: money(listing.originalPrice),
    quantity: money(listing.quantity),
    startingBid: money(listing.startingBid),
    reservePrice: money(listing.reservePrice),
    auctionDurationHours:
      (listing.auctionDurationHours as SellDraft["auctionDurationHours"]) ??
      EMPTY_DRAFT.auctionDurationHours,
    specialTags: Array.isArray(listing.specialTags)
      ? (listing.specialTags as SellDraft["specialTags"])
      : [],
    fulfillmentMethod: (str(listing.fulfillmentMethod) ||
      EMPTY_DRAFT.fulfillmentMethod) as SellDraft["fulfillmentMethod"],
    shippingPayer: (str(listing.shippingPayer) ||
      EMPTY_DRAFT.shippingPayer) as SellDraft["shippingPayer"],
    city: (CITIES as readonly string[]).includes(str(listing.city))
      ? (str(listing.city) as SellDraft["city"])
      : EMPTY_DRAFT.city,
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

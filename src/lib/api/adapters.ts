import { coverPhotoUrl, type Listing } from "./schemas/listing";
import { discountPercent } from "@/lib/format/money";
import type { Category } from "./schemas/catalog";
import type { ProductCard } from "./schemas/cards";

/**
 * Flattens the category tree into an id → name lookup.
 *
 * `GET /listings` returns only `categoryId`, while `GET /trends` returns a joined
 * `category { id, name }`. Rather than leave raw-listing cards without a category
 * (which also disables the Just Listed chips), callers that already hold the tree
 * can pass this in and get parity between the two shapes.
 */
export function categoryIndex(
  categories: Category[],
): Map<string, { id: string; name: string }> {
  const index = new Map<string, { id: string; name: string }>();
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      index.set(node.id, { id: node.id, name: node.name });
      if (node.children?.length) walk(node.children);
    }
  };
  walk(categories);
  return index;
}

/**
 * Maps every category id — at any depth — to its **top-level** ancestor.
 *
 * Listings sit on leaf categories ("Shirts", "Dresses") while the design's filter
 * chips are the top-level ones ("Women", "Men"). Comparing the two directly never
 * matches, so this resolves a listing's category up to its root.
 */
export function rootCategoryIndex(
  categories: Category[],
): Map<string, { id: string; name: string }> {
  const index = new Map<string, { id: string; name: string }>();
  const walk = (nodes: Category[], root: { id: string; name: string }) => {
    for (const node of nodes) {
      index.set(node.id, root);
      if (node.children?.length) walk(node.children, root);
    }
  };
  for (const top of categories) {
    walk([top], { id: top.id, name: top.name });
  }
  return index;
}

/**
 * Normalises a raw `GET /listings` record into the card shape that `GET /trends`
 * already returns.
 *
 * The API has two representations of the same thing: a flat, joined card DTO
 * (trends, home rails) and the raw listing row (listings, search). Adapting at
 * the boundary means `ProductCard` renders both, instead of every surface
 * branching on which endpoint the data came from.
 *
 * Fields the raw listing doesn't carry — seller handle, brand and category
 * names — come back undefined rather than being faked; the card omits them.
 */
export function listingToCard(
  listing: Listing,
  categories?: Map<string, { id: string; name: string }>,
): ProductCard {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price ?? null,
    originalPrice: listing.originalPrice ?? null,
    discountPercent: discountPercent(listing.originalPrice, listing.price),
    currency: listing.currency ?? "SAR",
    coverPhotoUrl: coverPhotoUrl(listing),
    photoUrls: listing.photos?.map((p) => p.url) ?? null,
    saleMode: listing.saleMode ?? null,
    condition: listing.condition ?? null,
    cta: null,
    badge: null,
    likeCount: listing.likeCount ?? null,
    isLiked: null,
    ratingAvg: listing.ratingAvg ?? null,
    ratingCount: listing.ratingCount ?? null,
    viewCount: listing.viewCount ?? null,
    seller: null,
    brand: null,
    // Resolved from the tree when the caller has it; otherwise omitted, never faked.
    category: listing.categoryId
      ? (categories?.get(listing.categoryId) ?? null)
      : null,
    auction: listing.auctionEnabled
      ? {
          currentBid: listing.currentBid ?? null,
          startingBid: listing.startingBid ?? null,
          bidCount: listing.bidCount ?? null,
          endsAt: listing.auctionEndsAt ?? null,
        }
      : null,
    publishedAt: listing.publishedAt ?? null,
  };
}

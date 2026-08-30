import { coverPhotoUrl, type Listing } from "./schemas/listing";
import type { SellerItem } from "./schemas/seller";
import { discountPercent } from "@/lib/format/money";
import type { Category } from "./schemas/catalog";
import type { ProductCard } from "./schemas/cards";

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
 * Since GAP-34 the two shapes carry the same joined `seller`, `brand` and
 * `category`, so nothing here is derived or omitted any more.
 */
export function listingToCard(listing: Listing): ProductCard {
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
    seller: listing.seller ?? null,
    brand: listing.brand ?? null,
    category: listing.category ?? null,
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

/**
 * Normalises an item from `GET /sellers/{id}/items` into the same card shape.
 *
 * A third representation of a listing, slimmer than both the others: no
 * `saleMode`, no auction block, and `photos` is `[{ url }]` with no `isCover`
 * flag — so the first photo is the cover by position, which is the order the
 * endpoint returns them in. `category` arrived with GAP-37.
 *
 * The seller is passed in rather than read off the item: on a seller's own
 * profile every card belongs to the same person, and the endpoint doesn't
 * repeat that on each row.
 */
export function sellerItemToCard(
  item: SellerItem,
  seller?: { id: string; handle?: string | null; profilePic?: string | null; isVerified?: boolean | null },
): ProductCard {
  return {
    id: item.id,
    title: item.title,
    price: item.price != null ? String(item.price) : null,
    originalPrice: item.originalPrice != null ? String(item.originalPrice) : null,
    discountPercent: discountPercent(item.originalPrice, item.price),
    currency: item.currency ?? "SAR",
    coverPhotoUrl: item.photos?.[0]?.url ?? null,
    photoUrls: item.photos?.map((p) => p.url) ?? null,
    saleMode: null,
    condition: item.condition ?? null,
    cta: null,
    badge: null,
    likeCount: item.likeCount ?? null,
    isLiked: null,
    ratingAvg: null,
    ratingCount: null,
    viewCount: null,
    seller: seller
      ? {
          id: seller.id,
          handle: seller.handle ?? null,
          profilePic: seller.profilePic ?? null,
          isVerified: seller.isVerified ?? null,
          isTopSeller: null,
        }
      : null,
    brand: null,
    category: item.category ?? null,
    auction: null,
    publishedAt: null,
  };
}

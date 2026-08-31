import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import {
  ShieldCheck,
  Truck,
  Undo2,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getListing, getRelatedListings } from "@/lib/api/endpoints/listings";
import { listingToCard } from "@/lib/api/adapters";
import {
  coverPhotoUrl,
  type Listing,
  type ListingSeller,
} from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, discountPercent } from "@/lib/format/money";
import { pickLocalized } from "@/lib/i18n/localized";
import { ProductCard } from "@/components/commerce/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { ProductTabs } from "@/features/catalog/components/product-tabs";
import { ProductReviews } from "@/features/catalog/components/product-reviews";
import { getListingReviews } from "@/lib/api/endpoints/reviews";
import { ProductAttributes } from "@/features/catalog/components/product-attributes";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getShippingOptions } from "@/lib/api/endpoints/checkout";
import { amountOf } from "@/lib/api/schemas/auction";
import { BidPanel } from "@/features/auctions/components/bid-panel";
import { BidHistory } from "@/features/auctions/components/bid-history";
import { TradePanel } from "@/features/trade/components/trade-panel";
import type { Locale } from "@/i18n/routing";

/**
 * Product detail page — Figma node 651:4420 (Web_PDP).
 *
 * ISR: product pages are the SEO surface of the marketplace, so they are
 * pre-rendered and revalidated by tag rather than rendered per request.
 */
export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const listing = await getListing(id);
  if (!listing) return {};

  const image = resolveMediaUrl(coverPhotoUrl(listing));

  return {
    title: listing.title,
    description: listing.description ?? undefined,
    openGraph: {
      title: listing.title,
      description: listing.description ?? undefined,
      images: image ? [image] : undefined,
      type: "website",
    },
  };
}

/**
 * What the bid panel can know from the ISR'd listing alone. Live numbers
 * arrive from the panel's own `auction-status` poll, kept client-side so the
 * PDP stays statically generated. Since GAP-66 landed that poll answers for
 * signed-out visitors too.
 */
function bidSnapshot(listing: Listing) {
  const currentBid =
    amountOf(listing.currentBid) || amountOf(listing.startingBid);
  return {
    listingId: listing.id,
    currency: listing.currency ?? "SAR",
    currentBid,
    startingBid: amountOf(listing.startingBid),
    bidCount: listing.bidCount ?? 0,
    endsAt: listing.auctionEndsAt ?? null,
    // The API's own floor, mirrored: current bid plus the larger of the two
    // increments. Re-derived server-side on every bid regardless.
    minNextBid: Math.ceil(
      currentBid +
        Math.max(
          (currentBid * (listing.minBidIncrementPercent ?? 0)) / 100,
          amountOf(listing.minBidIncrementAbsolute),
        ),
    ),
    antiSnipeWindowSeconds: listing.antiSnipeWindowSeconds ?? null,
    antiSnipeExtensionSeconds: listing.antiSnipeExtensionSeconds ?? null,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const listing = await getListing(id);
  if (!listing) notFound();

  const t = await getTranslations("Pdp");
  const tCatalog = await getTranslations("Catalog");
  const tListing = await getTranslations("Listing");
  const activeLocale = (await getLocale()) as Locale;

  const [related, shippingOptions, reviews, currentUser] = await Promise.all([
    getRelatedListings(listing, 4),
    // Real delivery options rather than the design's hardcoded examples.
    getShippingOptions().catch(() => []),
    /* Public since GAP-71. A failure here must not take the product page down. */
    getListingReviews(id).catch(() => ({ items: [], total: 0 })),
    /* Only to name the viewer's own bid in the auction panel's banner. */
    getCurrentUser(),
  ]);

  /*
   * Category and brand ride along on the detail response, so the page no
   * longer walks the category tree to resolve a name — one fewer request, and
   * it resolves a category at any depth rather than only one in the tree we
   * happened to fetch.
   */
  const category = listing.category ?? null;
  const brand = listing.brand ?? null;
  const photos = (listing.photos ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder,
    )
    .map((p) => p.url);

  const saving = discountPercent(listing.originalPrice, listing.price);

  const specRows = [
    {
      label: t("specs.condition"),
      value: listing.condition
        ? tListing(`conditions.${listing.condition}`)
        : null,
    },
    { label: t("specs.saleMode"), value: listing.saleMode },
    { label: t("specs.city"), value: listing.city },
    { label: t("specs.quantity"), value: listing.quantity?.toString() },
    {
      label: t("specs.authenticity"),
      value:
        listing.authenticityScore != null
          ? `${listing.authenticityScore}%`
          : null,
    },
  ].filter((row): row is { label: string; value: string } =>
    Boolean(row.value),
  );
  const isAuction = listing.saleMode === "auction" || listing.auctionEnabled;
  /*
    Web_PDP_Trade (`651:4611`) is the same page with its buy column replaced:
    a trade listing is not for sale, so it prints an estimated value rather than
    a price and offers Request trade rather than Buy now.
  */
  const isTrade = listing.saleMode === "trade";

  /**
   * Structured data so the listing is eligible for rich results. Only fields we
   * actually have are emitted — an invented `availability` would be a schema.org
   * violation, not just untidy. `brand` is a real one now that the detail
   * response joins it.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    ...(listing.description ? { description: listing.description } : {}),
    ...(brand
      ? {
          brand: {
            "@type": "Brand",
            name: pickLocalized(brand, "name", activeLocale),
          },
        }
      : {}),
    ...(photos.length
      ? { image: photos.map((p) => resolveMediaUrl(p)).filter(Boolean) }
      : {}),
    ...(listing.price
      ? {
          offers: {
            "@type": "Offer",
            price: listing.price,
            priceCurrency: listing.currency ?? "SAR",
            availability:
              listing.status === "live"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: tCatalog("home"), href: "/" },
          ...(category
            ? [
                {
                  label: pickLocalized(category, "name", activeLocale),
                  href: `/products?categoryId=${category.id}`,
                },
              ]
            : []),
          { label: listing.title },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductGallery urls={photos} title={listing.title} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {listing.condition && (
              <span className="bg-action-tint text-action rounded-[6px] px-2 py-1 text-[10px] font-bold">
                {tListing(`conditions.${listing.condition}`)}
              </span>
            )}
            {brand && (
              <Link
                href={`/products?brandId=${brand.id}`}
                className="text-caption text-ink-secondary font-semibold hover:underline"
              >
                {pickLocalized(brand, "name", activeLocale)}
              </Link>
            )}
            {category && (
              <span className="text-caption text-ink-tertiary">
                {pickLocalized(category, "name", activeLocale)}
              </span>
            )}
          </div>

          {/* Seller-authored text: dir="auto" so an Arabic title reads correctly. */}
          <h1 className="text-[32px] leading-tight font-bold" dir="auto">
            {listing.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-3">
            {!isAuction && !isTrade && (
              <span className="text-[28px] font-bold">
                {formatPrice(listing.price, listing.currency ?? "SAR")}
              </span>
            )}
            {saving !== null && (
              <>
                <span className="text-body-lg text-ink-tertiary line-through">
                  {formatPrice(
                    listing.originalPrice,
                    listing.currency ?? "SAR",
                  )}
                </span>
                <span className="text-label text-action">
                  {t("save", { percent: saving })}
                </span>
              </>
            )}
          </div>

          {isAuction && (
            <BidPanel
              snapshot={bidSnapshot(listing)}
              locale={locale}
              viewerId={currentUser?.id ?? null}
              termsHref={`/${locale}/auctions/${listing.id}/terms`}
            />
          )}

          {isTrade && (
            <TradePanel
              listingId={listing.id}
              value={listing.price}
              currency={listing.currency ?? "SAR"}
              authenticityScore={listing.authenticityScore}
              locale={locale}
              labels={{
                badge: t("trade.badge"),
                estimatedValue: t("trade.estimatedValue"),
                estimatedValueHint: t("trade.estimatedValueHint"),
                cashTopUp: t("trade.cashTopUp"),
                requestTrade: t("trade.requestTrade"),
                messageSeller: t("trade.messageSeller"),
                authenticity: t("trade.authenticity"),
                authenticityOf: t("trade.authenticityOf"),
                trusted: t("trade.trusted"),
                shippingTitle: t("trade.shippingTitle"),
                shippingBody: t("trade.shippingBody"),
              }}
            />
          )}

          <SellerCard
            seller={listing.seller ?? null}
            sellerId={listing.sellerId}
            label={t("viewSeller")}
          />

          <ProductAttributes attributes={listing.attributes} />

          {/*
            Buy / bag / trade all require a session and a mutation
            (POST /bag/items, POST /orders/checkout, POST /listings/{id}/trade-requests).
            Those land with the cart and trade work; here they route to the
            correct next step rather than being dead buttons.
          */}
          {/* A trade listing's actions are the TradePanel's, above. */}
          {!isTrade && (
            <div className="flex flex-col gap-3">
              {!isAuction && (
                <Link
                  href="/cart"
                  className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
                >
                  {t("buyNow")}
                </Link>
              )}
              {!isAuction && (
                <Link
                  href="/cart"
                  className="border-ink text-label flex h-12 items-center justify-center rounded-[24px] border font-semibold"
                >
                  {t("addToBag")}
                </Link>
              )}
            </div>
          )}

          <ul className="flex flex-wrap gap-2">
            {[
              { key: "shipping", icon: Truck },
              { key: "returns", icon: Undo2 },
              { key: "verified", icon: ShieldCheck },
            ].map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="bg-tint text-caption text-ink-secondary flex items-center gap-1.5 rounded-[14px] px-3 py-1.5"
              >
                <Icon className="size-3" aria-hidden />
                {t(`trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductTabs
        tabs={[
          {
            key: "description",
            label: t("tabs.description"),
            panel: listing.description ? (
              <p
                className="text-body text-ink-secondary max-w-[760px] whitespace-pre-line"
                dir="auto"
              >
                {listing.description}
              </p>
            ) : (
              <p className="text-body text-ink-tertiary">
                {t("noDescription")}
              </p>
            ),
          },
          {
            key: "specs",
            label: t("tabs.specs"),
            panel: (
              <dl className="max-w-[760px] overflow-hidden rounded-12">
                {specRows.map((row, index) => (
                  <div
                    key={row.label}
                    /* Zebra striping, per the design's specifications table. */
                    className={`flex justify-between gap-6 px-4 py-3 ${
                      index % 2 === 1 ? "bg-surface" : ""
                    }`}
                  >
                    <dt className="text-caption text-ink-tertiary">
                      {row.label}
                    </dt>
                    <dd className="text-caption text-end" dir="auto">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ),
          },
          {
            key: "shipping",
            label: t("tabs.shipping"),
            panel: (
              <ul className="flex max-w-[760px] flex-col gap-4">
                {shippingOptions.map((option) => (
                  <li key={option.id} className="flex gap-3">
                    <span
                      className="bg-action mt-1.5 size-2 shrink-0 rounded-full"
                      aria-hidden
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-label">
                        {pickLocalized(option, "name", activeLocale)}
                      </span>
                      <span className="text-caption text-ink-secondary">
                        {Number(option.price) === 0
                          ? t("shippingFree")
                          : t("shippingPrice", {
                              price: formatPrice(option.price),
                            })}
                        {/* Pickup has a 0–0 window; showing it reads as an error. */}
                        {option.etaMaxDays != null &&
                          option.etaMaxDays > 0 &&
                          ` · ${t("shippingEta", {
                            min: option.etaMinDays ?? 0,
                            max: option.etaMaxDays,
                          })}`}
                      </span>
                    </span>
                  </li>
                ))}
                <li className="flex gap-3">
                  <span
                    className="bg-action mt-1.5 size-2 shrink-0 rounded-full"
                    aria-hidden
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-label">{t("buyerProtection")}</span>
                    <span className="text-caption text-ink-secondary">
                      {t("buyerProtectionBody")}
                    </span>
                  </span>
                </li>
              </ul>
            ),
          },
          {
            key: "reviews",
            label: t("tabs.reviews"),
            /* 651:4420's fourth tab. Public since GAP-71 — it had no source before. */
            panel: (
              <ProductReviews reviews={reviews.items} total={reviews.total} />
            ),
          },
        ]}
      />

      {/* Bid History — 651:4903, drawn under PDP_Auction_HighestBidder. */}
      {isAuction && (
        <BidHistory
          listingId={listing.id}
          currency={listing.currency ?? "SAR"}
          viewerId={currentUser?.id ?? null}
          viewerName={currentUser?.fullName ?? null}
          locale={activeLocale}
          labels={{
            title: t("bidHistory"),
            you: t("bidHistoryYou"),
            bidder: t("bidHistoryBidder"),
            empty: t("bidHistoryEmpty"),
          }}
        />
      )}

      {related.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-h1">{t("youMayAlsoLike")}</h2>
            <Link href="/products" className="text-label text-action">
              {tCatalog("viewAll")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} card={listingToCard(item)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Seller strip — Figma node `651:4457`.
 *
 * `GET /listings/{id}` embeds the full seller and `GET /sellers/{id}` is
 * publicly readable (API-25), so the design's card is buildable on a page with
 * no session. It was a bare "View seller" chevron before: the listing carried
 * only a `sellerId`, and the profile endpoint 401'd anonymously.
 *
 * Two deliberate departures from the frame:
 *
 * - The design's right-hand action is a **Message** button. Messaging isn't
 *   built (Phase 6) and `/conversations` has no UI yet, so that would be a dead
 *   button. The whole strip links to the seller profile instead, which exists.
 * - The design shows no verification mark here; verification is a "Verified
 *   Seller" pill in the trust row below, which this page already renders.
 *
 * `seller` stays optional because the field is undocumented in the spec — if it
 * ever stops being sent, the chevron is the fallback rather than a crash.
 */
async function SellerCard({
  seller,
  sellerId,
  label,
}: {
  seller: ListingSeller | null;
  sellerId: string;
  label: string;
}) {
  const t = await getTranslations("Pdp");
  const href = `/sellers/${seller?.id ?? sellerId}`;

  if (!seller) {
    return (
      <Link
        href={href}
        className="border-line hover:border-action flex items-center justify-between gap-4 rounded-12 border p-4"
      >
        <span className="text-label text-ink-secondary">{label}</span>
        <ChevronRight
          className="text-ink-tertiary size-4 rtl:rotate-180"
          aria-hidden
        />
      </Link>
    );
  }

  const avatar = resolveMediaUrl(seller.profilePic);
  const rating = seller.ratingAvg != null ? Number(seller.ratingAvg) : null;

  /*
   * The design's sub-line is "4.9 stars · 247 sold" — two separate facts, not a
   * rating with a review count in brackets. Each appears only when the payload
   * carries it: "0 sold" under a new seller's name reads as a warning.
   */
  const facts: string[] = [];
  if (
    rating !== null &&
    Number.isFinite(rating) &&
    (seller.ratingCount ?? 0) > 0
  ) {
    facts.push(t("sellerRating", { rating: rating.toFixed(1) }));
  }
  if ((seller.itemsSoldCount ?? 0) > 0) {
    facts.push(t("sellerSold", { count: seller.itemsSoldCount ?? 0 }));
  }

  /* Initials fallback, as in the frame ("LF" for luxury_finds). */
  const initials = (seller.username ?? seller.fullName ?? "?")
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <Link
      href={href}
      className="border-line hover:border-action flex items-center gap-4 rounded-12 border p-4"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className="bg-tint text-ink-secondary text-label flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden
        >
          {initials}
        </span>
      )}

      <span className="flex min-w-0 flex-col gap-0.5">
        {/*
          The design leads with the handle, not the display name — that's the
          identity a marketplace buyer recognises, and it's Latin-script even in
          the Arabic locale, so it needs no bidi isolation.
        */}
        <span className="text-label truncate">
          {seller.username ?? seller.fullName}
        </span>
        {facts.length > 0 && (
          <span className="text-caption text-ink-tertiary">
            {facts.join(" · ")}
          </span>
        )}
      </span>

      <span className="text-caption text-action ms-auto shrink-0">{label}</span>
      <ChevronRight
        className="text-ink-tertiary size-4 shrink-0 rtl:rotate-180"
        aria-hidden
      />
    </Link>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import {
  ShieldCheck,
  Truck,
  Undo2,
  ArrowLeftRight,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getListing, getRelatedListings } from "@/lib/api/endpoints/listings";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { listingToCard } from "@/lib/api/adapters";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, discountPercent } from "@/lib/format/money";
import { pickLocalized } from "@/lib/i18n/localized";
import { ProductCard } from "@/components/commerce/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { ProductTabs } from "@/features/catalog/components/product-tabs";
import { ProductAttributes } from "@/features/catalog/components/product-attributes";
import { getShippingOptions } from "@/lib/api/endpoints/checkout";
import type { Category } from "@/lib/api/schemas/catalog";
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

  const [categories, related, shippingOptions] = await Promise.all([
    getCategoryTree(),
    getRelatedListings(listing, 4),
    // Real delivery options rather than the design's hardcoded examples.
    getShippingOptions().catch(() => []),
  ]);

  const category = findCategory(categories, listing.categoryId ?? undefined);
  const photos = (listing.photos ?? [])
    .slice()
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder)
    .map((p) => p.url);

  const saving = discountPercent(listing.originalPrice, listing.price);

  const specRows = [
    {
      label: t("specs.condition"),
      value: listing.condition ? tListing(`conditions.${listing.condition}`) : null,
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
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));
  const isAuction = listing.saleMode === "auction" || listing.auctionEnabled;

  /**
   * Structured data so the listing is eligible for rich results. Only fields we
   * actually have are emitted — an invented `availability` or `brand` would be
   * a schema.org violation, not just untidy.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    ...(listing.description ? { description: listing.description } : {}),
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
            <span className="text-[28px] font-bold">
              {isAuction
                ? formatPrice(
                    listing.currentBid ?? listing.startingBid,
                    listing.currency ?? "SAR",
                  )
                : formatPrice(listing.price, listing.currency ?? "SAR")}
            </span>
            {saving !== null && (
              <>
                <span className="text-body-lg text-ink-tertiary line-through">
                  {formatPrice(listing.originalPrice, listing.currency ?? "SAR")}
                </span>
                <span className="text-label text-action">
                  {t("save", { percent: saving })}
                </span>
              </>
            )}
          </div>

          {isAuction && (
            <p className="text-caption text-ink-secondary">
              {t("bidCount", { count: listing.bidCount ?? 0 })}
            </p>
          )}

          <SellerCard sellerId={listing.sellerId} label={t("viewSeller")} />

          <ProductAttributes attributes={listing.attributes} />

          {/*
            Buy / bag / trade all require a session and a mutation
            (POST /bag/items, POST /orders/checkout, POST /listings/{id}/trade-requests).
            Those land with the cart and trade work; here they route to the
            correct next step rather than being dead buttons.
          */}
          <div className="flex flex-col gap-3">
            <Link
              href={isAuction ? `/auctions/${listing.id}/terms` : "/cart"}
              className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
            >
              {isAuction ? t("placeBid") : t("buyNow")}
            </Link>
            {!isAuction && (
              <Link
                href="/cart"
                className="border-ink text-label flex h-12 items-center justify-center rounded-[24px] border font-semibold"
              >
                {t("addToBag")}
              </Link>
            )}
            {listing.saleMode === "trade" && (
              <Link
                href={`/trade/offer/${listing.id}`}
                className="border-line text-label text-ink-secondary flex h-12 items-center justify-center gap-2 rounded-[24px] border"
              >
                <ArrowLeftRight className="size-4" aria-hidden />
                {t("offerTrade")}
              </Link>
            )}
          </div>

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
              <p className="text-body text-ink-tertiary">{t("noDescription")}</p>
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
                    <dt className="text-caption text-ink-tertiary">{row.label}</dt>
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
                    <span className="bg-action mt-1.5 size-2 shrink-0 rounded-full" aria-hidden />
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
                  <span className="bg-action mt-1.5 size-2 shrink-0 rounded-full" aria-hidden />
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
        ]}
      />

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
 * Seller strip.
 *
 * The design shows the seller's name, rating and items-sold here, but
 * `GET /sellers/{id}` requires authentication (verified — 401 anonymously) and
 * `GET /listings` doesn't join the seller. So on a public product page there is
 * no seller data to show, and a raw UUID is worse than none.
 *
 * Reported as API-25. When the seller profile becomes publicly readable, this
 * becomes the full card from the design.
 */
function SellerCard({ sellerId, label }: { sellerId: string; label: string }) {
  return (
    <Link
      href={`/sellers/${sellerId}`}
      className="border-line hover:border-action flex items-center justify-between gap-4 rounded-12 border p-4"
    >
      <span className="text-label text-ink-secondary">{label}</span>
      <ChevronRight className="text-ink-tertiary size-4 rtl:rotate-180" aria-hidden />
    </Link>
  );
}

/** Categories nest, and a listing can sit on any level, so this recurses. */
function findCategory(
  categories: Category[],
  id?: string,
): Category | undefined {
  if (!id) return undefined;
  for (const category of categories) {
    if (category.id === id) return category;
    const match = findCategory(category.children ?? [], id);
    if (match) return match;
  }
  return undefined;
}

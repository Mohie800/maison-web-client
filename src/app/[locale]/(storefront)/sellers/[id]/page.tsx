import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getSeller,
  getSellerItems,
  getSellerReviews,
  getSellerFollowers,
} from "@/lib/api/endpoints/sellers";
import { sellerItemToCard } from "@/lib/api/adapters";
import { resolveMediaUrl } from "@/lib/api/media";
import {
  SELLER_ITEM_SORTS,
  type SellerItemSort,
} from "@/lib/api/schemas/seller";
import { ProductCard } from "@/components/commerce/product-card";
import { SellerCategorySidebar } from "@/features/sellers/components/seller-category-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/features/catalog/components/pagination";
import { SellerBanner } from "@/features/sellers/components/seller-banner";
import { SellerReviews } from "@/features/sellers/components/seller-reviews";
import { SellerAbout } from "@/features/sellers/components/seller-about";

/**
 * Seller profile — Figma node `651:9052` (Web_SellerProfile).
 *
 * Public. `GET /sellers/{id}` and its four sub-collections stopped requiring a
 * token in the backend's Round 2 drop (API-25), which is what made this page
 * buildable at all — until then the PDP's seller card had nowhere to go.
 *
 * Tabs are URL state (`?tab=`), not component state: each tab is a real,
 * shareable, indexable page, the listings grid keeps its own `sort` and `page`
 * params, and reviews paginate independently. That also means only the active
 * tab's data is fetched.
 *
 * The category sidebar is real since GAP-37: `?categoryId=` filters
 * server-side, a parent includes its children, and the response carries the
 * rail itself.
 *
 * One departure from the frame remains: **no Message button**. Messaging is
 * Phase 6 and has no route yet, and a dead control is worse than an absent one
 * (plans/09 C14).
 */

const PAGE_SIZE = 24;
const REVIEWS_PAGE_SIZE = 10;

type Tab = "listings" | "reviews" | "about";
const TABS: Tab[] = ["listings", "reviews", "about"];

interface SearchParams {
  tab?: string;
  sort?: string;
  page?: string;
  categoryId?: string;
}

function parseTab(value?: string): Tab {
  return TABS.includes(value as Tab) ? (value as Tab) : "listings";
}

function parseSort(value?: string): SellerItemSort {
  return SELLER_ITEM_SORTS.includes(value as SellerItemSort)
    ? (value as SellerItemSort)
    : "newest";
}

function parsePage(value?: string): number {
  const n = Number(value ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const seller = await getSeller(id);
  if (!seller) return {};

  const handle = seller.username ?? seller.fullName ?? "";
  const image = resolveMediaUrl(seller.profilePic);

  return {
    title: `@${handle}`,
    description: seller.bio ?? seller.aboutText ?? undefined,
    openGraph: {
      title: `@${handle}`,
      description: seller.bio ?? seller.aboutText ?? undefined,
      images: image ? [image] : undefined,
      type: "profile",
    },
  };
}

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const categoryId = sp.categoryId || undefined;

  const seller = await getSeller(id);
  if (!seller) notFound();

  const t = await getTranslations("Seller");
  const tCatalog = await getTranslations("Catalog");

  /*
   * The banner's counts come from the collections rather than the profile's own
   * counters, which are never incremented (GAP-36). `sold` and `followers` are
   * fetched at limit 1 — only their `total` is used, so there's no reason to
   * pull rows we won't render.
   */
  const [listings, reviews, followers, sold] = await Promise.all([
    getSellerItems(id, {
      page: tab === "listings" ? page : 1,
      limit: PAGE_SIZE,
      sort,
      ...(categoryId ? { categoryId } : {}),
    }),
    getSellerReviews(id, {
      page: tab === "reviews" ? page : 1,
      limit: tab === "reviews" ? REVIEWS_PAGE_SIZE : 1,
    }),
    getSellerFollowers(id, { limit: 1 }),
    getSellerItems(id, { filter: "sold", limit: 1 }),
  ]);

  const handle = seller.username ?? seller.fullName ?? "";
  const cardSeller = {
    id: seller.id,
    handle: seller.username,
    profilePic: seller.profilePic,
    isVerified: seller.isVerified,
  };

  const href = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged = { tab, sort, page: String(page), categoryId, ...next };
    if (merged.tab && merged.tab !== "listings") params.set("tab", merged.tab);
    if (merged.sort && merged.sort !== "newest")
      params.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    if (merged.categoryId) params.set("categoryId", merged.categoryId);
    const query = params.toString();
    return `/sellers/${id}${query ? `?${query}` : ""}`;
  };

  const tabCounts: Record<Tab, number | null> = {
    listings: listings.total,
    reviews: reviews.summary?.total ?? reviews.total,
    about: null,
  };

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 lg:px-20">
        <Breadcrumbs
          items={[
            { label: tCatalog("home"), href: "/" },
            { label: `@${handle}` },
          ]}
        />
      </div>

      <SellerBanner
        seller={seller}
        counts={{
          sales: sold.total,
          followers: followers.total,
          rating: reviews.summary?.average ?? null,
          reviews: reviews.summary?.total ?? reviews.total,
        }}
        /* Conversations open against a listing, never a person — see the banner. */
        messageListingId={listings.items[0]?.id}
      />

      {/* Tab bar — links, so each tab is its own URL. */}
      <nav className="border-line border-b">
        <ul className="mx-auto flex max-w-[1440px] gap-1 px-4 lg:px-20">
          {TABS.map((key) => {
            const active = key === tab;
            const count = tabCounts[key];
            return (
              <li key={key}>
                <Link
                  href={href({ tab: key, page: "1" })}
                  aria-current={active ? "page" : undefined}
                  className={`text-label flex h-13 items-center border-b-2 px-5 ${
                    active
                      ? "border-ink"
                      : "text-ink-tertiary hover:text-ink border-transparent"
                  }`}
                >
                  {t(`tabs.${key}`)}
                  {count !== null && count > 0 && ` (${count})`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 lg:px-20">
        {tab === "listings" && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Sidebar — 651:9088 */}
            <SellerCategorySidebar
              categories={listings.categories ?? []}
              activeId={categoryId}
              buildHref={(next) => href({ categoryId: next ?? "", page: "1" })}
            />

            {/* Grid — 651:9097 */}
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-label">
                  {t("listingCount", { count: listings.total })}
                </p>

                {/* Three sorts, because three is what the endpoint accepts. */}
                <ul className="flex gap-2">
                  {SELLER_ITEM_SORTS.map((option) => {
                    const active = option === sort;
                    return (
                      <li key={option}>
                        <Link
                          href={href({ sort: option, page: "1" })}
                          aria-pressed={active}
                          className={`text-caption rounded-[16px] border px-3 py-1.5 ${
                            active
                              ? "border-action bg-action-tint text-action font-semibold"
                              : "border-line text-ink-secondary hover:border-ink-tertiary"
                          }`}
                        >
                          {t(`sorts.${option}`)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {listings.items.length === 0 ? (
                <div className="border-line rounded-16 border p-10 text-center">
                  <p className="text-label">{t("listingsEmptyTitle")}</p>
                  <p className="text-body text-ink-tertiary mt-1">
                    {t("listingsEmptyBody")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                    {listings.items.map((item) => (
                      <ProductCard
                        key={item.id}
                        card={sellerItemToCard(item, cardSeller)}
                      />
                    ))}
                  </div>

                  <Pagination
                    page={page}
                    total={listings.total}
                    pageSize={PAGE_SIZE}
                    buildHref={(next) => href({ page: String(next) })}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <>
            <SellerReviews
              summary={reviews.summary ?? null}
              reviews={reviews.items}
              total={reviews.summary?.total ?? reviews.total}
            />
            <Pagination
              page={page}
              total={reviews.total}
              pageSize={REVIEWS_PAGE_SIZE}
              buildHref={(next) => href({ page: String(next) })}
            />
          </>
        )}

        {tab === "about" && <SellerAbout seller={seller} />}
      </div>
    </div>
  );
}

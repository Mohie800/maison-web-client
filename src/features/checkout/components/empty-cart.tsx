import { getTranslations } from "next-intl/server";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getFeaturedListings } from "@/lib/api/endpoints/listings";
import { listingToCard } from "@/lib/api/adapters";
import { ProductCard } from "@/components/commerce/product-card";

/**
 * Empty bag — Figma `651:7507`.
 *
 * The design's "You might like" rail is newest-first, the same honest
 * approximation the homepage uses: there is no recommendation endpoint and no
 * `featured` flag to rank by (API-06).
 */
export async function EmptyCart() {
  const t = await getTranslations("Checkout");

  const suggestions = await getFeaturedListings(4).catch(() => []);

  return (
    <div className="bg-surface min-h-full px-4 py-14 lg:px-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="bg-action-tint flex size-16 items-center justify-center rounded-full">
            <ShoppingBag className="text-action size-7" aria-hidden />
          </span>
          <h1 className="text-h1">{t("emptyTitle")}</h1>
          <p className="text-body text-ink-secondary max-w-[380px] whitespace-pre-line">
            {t("emptyBody")}
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="bg-action text-label flex h-12 items-center rounded-[24px] px-7 font-semibold text-white"
            >
              {t("startShopping")}
            </Link>
            <Link
              href="/categories"
              className="border-line bg-base text-label flex h-12 items-center rounded-[24px] border px-7 font-semibold"
            >
              {t("browseCategories")}
            </Link>
          </div>
        </div>

        {suggestions.length > 0 && (
          <section className="mt-14">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-h2">{t("youMightLike")}</h2>
              <Link href="/products" className="text-action text-label">
                {t("viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {suggestions.map((listing) => (
                <ProductCard key={listing.id} card={listingToCard(listing)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

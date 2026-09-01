import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSharedWishlist } from "@/lib/api/endpoints/wishlist";
import { WISHLIST_PAGE_SIZE } from "@/lib/api/schemas/wishlist";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, discountPercent } from "@/lib/format/money";
import { Pagination } from "@/features/catalog/components/pagination";

/**
 * A wishlist someone has published — the read half of GAP-42. Public: no
 * session, no bearer token.
 *
 * It is the owner's grid without the owner's controls. The three fields that
 * only mean something to them (the price-drop bell and the drop measured
 * against the price *they* saved at) are not in the payload, and the tab bar
 * is gone with them — a visitor is looking at a list, not managing one.
 *
 * `noindex`: the token is the only thing protecting the link, so it should not
 * end up in a search index.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedWishlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Wishlist");
  const tListing = await getTranslations("Listing");

  const rawPage = Number((await searchParams).page ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const shared = await getSharedWishlist(token, page).catch(() => null);

  if (!shared) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 lg:px-20">
        <div className="border-line bg-base mx-auto flex max-w-[480px] flex-col items-center rounded-16 border px-6 py-16 text-center">
          <h1 className="text-h2">{t("sharedGone")}</h1>
          <p className="text-body text-ink-secondary mt-3">
            {t("sharedGoneBody")}
          </p>
          <Link
            href="/products"
            className="bg-aqua text-on-accent text-label mt-6 flex h-12 items-center rounded-[24px] px-6 font-semibold"
          >
            {t("browse")}
          </Link>
        </div>
      </div>
    );
  }

  const avatar = resolveMediaUrl(shared.owner.profilePic);
  const name = shared.owner.handle ?? "";

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 lg:px-20">
      <header className="flex items-center gap-4">
        <span className="bg-tint text-ink-tertiary flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <Heart className="size-6" aria-hidden />
          )}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="text-h1 truncate" dir="auto">
            {t("sharedTitle", { name })}
          </h1>
          <p className="text-caption text-ink-tertiary">
            {t("sharedIntro", { count: shared.total })}
          </p>
        </div>
      </header>

      {shared.items.length === 0 ? (
        <p className="border-line text-body text-ink-tertiary rounded-16 border p-10 text-center">
          {t("sharedEmpty")}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {shared.items.map((item) => {
            const image = resolveMediaUrl(item.coverPhotoUrl);
            const saving = discountPercent(item.originalPrice, item.price);
            const currency = item.currency ?? "SAR";

            return (
              <li
                key={item.listingId}
                className="bg-base border-line flex flex-col overflow-hidden rounded-12 border"
              >
                <Link
                  href={`/products/${item.listingId}`}
                  className="bg-tint relative block aspect-square"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img src={image} alt="" className="size-full object-cover" />
                  ) : null}
                  {item.isSold && (
                    <span className="bg-invert text-caption absolute top-2 start-2 rounded-[11px] px-2.5 py-1 font-semibold text-white">
                      {t("sold")}
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <Link
                    href={`/products/${item.listingId}`}
                    className="text-label line-clamp-2"
                    dir="auto"
                  >
                    {item.title}
                  </Link>

                  {(item.category?.name || item.condition) && (
                    <p className="text-caption text-ink-tertiary truncate">
                      {[
                        item.condition &&
                          tListing(`conditions.${item.condition}`),
                        item.category?.name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-baseline gap-2">
                    <span className="text-label font-semibold" dir="ltr">
                      {formatPrice(item.price, currency)}
                    </span>
                    {saving !== null && (
                      <>
                        <span
                          className="text-caption text-ink-tertiary line-through"
                          dir="ltr"
                        >
                          {formatPrice(item.originalPrice, currency)}
                        </span>
                        <span className="text-caption text-action font-semibold">
                          −{saving}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        total={shared.total}
        pageSize={WISHLIST_PAGE_SIZE}
        buildHref={(next) =>
          `/wishlist/shared/${token}${next > 1 ? `?page=${next}` : ""}`
        }
      />
    </div>
  );
}

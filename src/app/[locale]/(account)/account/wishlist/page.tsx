import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, Bell, BellOff, Share2, X, TrendingDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWishlist } from "@/lib/api/endpoints/wishlist";
import {
  WISHLIST_PAGE_SIZE,
  WISHLIST_TABS,
  type WishlistTab,
} from "@/lib/api/schemas/wishlist";
import { resolveMediaUrl } from "@/lib/api/media";
import { requestOrigin } from "@/lib/api/origin";
import { formatPrice, discountPercent } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { Pagination } from "@/features/catalog/components/pagination";
import {
  moveToCartAction,
  removeFromWishlistAction,
  shareWishlistAction,
  toggleNotifyAction,
  unshareWishlistAction,
} from "@/features/wishlist/actions";
import { ShareLink } from "@/features/wishlist/components/share-link";

/**
 * Wishlist — Figma `651:8771`, with the empty state from `651:8897`.
 *
 * Three departures from the frame, each for a reason:
 *
 * - **Tabs added.** The design shows a flat grid, but the endpoint ships
 *   `?tab=all|on_sale|available|sold` *and* a `counts` object with real totals
 *   for each. Saved items going on sale or selling out is the whole point of a
 *   wishlist, so surfacing that split costs nothing and answers the question
 *   the screen exists to answer.
 * - **The "Like New · Fashion" chip line is the design's**, off `condition`
 *   and the joined `category` the row gained in GAP-41.
 * - **"Share Wishlist" mints a public link** (GAP-42). Nothing states whether a
 *   list is already shared, so the panel opens off the token in the URL after
 *   minting rather than off a read — GAP-81.
 *
 * The price-drop bell is *not* in the design, but `notifyOnPriceDrop` and its
 * PATCH endpoint exist and are the mechanism behind `priceDropped` — so the
 * control that governs it is shown rather than left dark.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WishlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Wishlist");
  const tListing = await getTranslations("Listing");
  const query = await searchParams;

  /*
    `?share=off` is only the "sharing stopped" notice; the panel's state is the
    list's own `isShared` / `shareToken`, read back since GAP-81 landed.
  */
  const share = Array.isArray(query.share) ? query.share[0] : query.share;

  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: WishlistTab = WISHLIST_TABS.includes(rawTab as WishlistTab)
    ? (rawTab as WishlistTab)
    : "all";

  const rawPage = Number(
    (Array.isArray(query.page) ? query.page[0] : query.page) ?? 1,
  );
  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const wishlist = await getWishlist(tab, page);
  /* The list's own share state, not the token we put in the URL (GAP-81). */
  const shareToken = wishlist.isShared ? (wishlist.shareToken ?? null) : null;
  const counts = wishlist.counts ?? {};

  const href = (next: { tab?: WishlistTab; page?: number }) => {
    const p = new URLSearchParams();
    const merged = { tab, page, ...next };
    if (merged.tab !== "all") p.set("tab", merged.tab);
    if (merged.page > 1) p.set("page", String(merged.page));
    const q = p.toString();
    return `/account/wishlist${q ? `?${q}` : ""}`;
  };

  const isEmpty = wishlist.items.length === 0 && tab === "all" && page === 1;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wishlist" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1">{t("title")}</h1>
          {(counts.all ?? wishlist.total) > 0 && (
            <span className="bg-fill-100 text-ink-500 flex h-6 items-center rounded-12 px-2.5 text-[12px] font-medium">
              {t("itemCount", { count: counts.all ?? wishlist.total })}
            </span>
          )}

          {/*
            Share — 651:8804. The frame draws a plain "Share Wishlist >" link in
            t/action, not a bordered button. It toggles rather than only opening,
            because minting a public link is reversible and the frame has no
            second control to stop it (GAP-42).
          */}
          <form
            action={shareToken ? unshareWishlistAction : shareWishlistAction}
            className="ms-auto"
          >
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="text-action flex items-center gap-1.5 text-[13px] font-medium"
            >
              <Share2 className="size-3.5" aria-hidden />
              {shareToken ? t("shareStop") : t("share")}
            </button>
          </form>
        </div>

        {share === "off" && (
          <p role="status" className="text-caption text-ink-tertiary">
            {t("shareOff")}
          </p>
        )}
        {shareToken && (
          <ShareLink
            url={`${await requestOrigin()}/${locale}/wishlist/shared/${shareToken}`}
            live={t("shareLive")}
            hint={t("shareCopyHint")}
          />
        )}

        {isEmpty ? (
          /* Empty state — Figma 651:8897. */
          <div className="border-line bg-base flex flex-col items-center rounded-16 border px-6 py-16 text-center">
            <span
              className="bg-action-tint text-action flex size-20 items-center justify-center rounded-full"
              aria-hidden
            >
              <Heart className="size-9" />
            </span>
            <h2 className="text-h2 mt-6">{t("emptyTitle")}</h2>
            <p className="text-body text-ink-secondary mt-3 max-w-[340px]">
              {t("emptyBody")}
            </p>
            <Link
              href="/products"
              className="bg-aqua text-on-accent text-label mt-6 flex h-12 items-center rounded-[24px] px-6 font-semibold"
            >
              {t("startBrowsing")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {WISHLIST_TABS.map((option) => {
                const active = option === tab;
                const count = counts[option];
                return (
                  <li key={option}>
                    <Link
                      href={href({ tab: option, page: 1 })}
                      aria-pressed={active}
                      className={`text-caption rounded-[16px] border px-3.5 py-1.5 ${
                        active
                          ? "border-action bg-action-tint text-action font-semibold"
                          : "border-line text-ink-secondary hover:border-ink-tertiary"
                      }`}
                    >
                      {t(`tabs.${option}`)}
                      {count != null && ` (${count})`}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {wishlist.items.length === 0 ? (
              <p className="border-line text-body text-ink-tertiary rounded-16 border p-10 text-center">
                {t("emptyTab")}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {wishlist.items.map((item) => {
                  const image = resolveMediaUrl(item.coverPhotoUrl);
                  const saving = discountPercent(
                    item.originalPrice,
                    item.price,
                  );
                  const currency = item.currency ?? "SAR";
                  const notifying = Boolean(item.notifyOnPriceDrop);

                  return (
                    <li
                      key={item.listingId}
                      className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border"
                    >
                      <Link
                        href={`/products/${item.listingId}`}
                        className="bg-fill-100 relative block h-[200px]"
                      >
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                        {item.isSold && (
                          <span className="bg-invert text-caption absolute top-2 start-2 rounded-[11px] px-2.5 py-1 font-semibold text-white">
                            {t("sold")}
                          </span>
                        )}
                      </Link>

                      <div className="flex flex-1 flex-col gap-1.5 p-3">
                        <Link
                          href={`/products/${item.listingId}`}
                          className="text-ink-900 line-clamp-2 text-[13px] font-semibold"
                          dir="auto"
                        >
                          {item.title}
                        </Link>

                        {(item.category?.name || item.condition) && (
                          /* M — 651:8811 */
                          <div className="flex items-center gap-1.5">
                            {item.condition && (
                              <span className="bg-action-tint text-action flex h-[18px] items-center rounded-[9px] px-1.5 text-[9px] font-medium">
                                {tListing(`conditions.${item.condition}`)}
                              </span>
                            )}
                            {item.category?.name && (
                              <span
                                className="text-ink-500 truncate text-[10px]"
                                dir="auto"
                              >
                                {item.category.name}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            className="text-ink-900 text-[15px] font-bold"
                            dir="ltr"
                          >
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

                        {/* Only when the price actually fell since saving. */}
                        {item.priceDropped &&
                          (item.priceDropAmount ?? 0) > 0 && (
                            <p className="text-caption text-action flex items-center gap-1.5">
                              <TrendingDown className="size-3.5" aria-hidden />
                              {t("priceDropped", {
                                amount: formatPrice(
                                  item.priceDropAmount,
                                  currency,
                                ),
                              })}
                            </p>
                          )}

                        <div className="mt-auto flex items-center gap-2 pt-1">
                          {item.isAvailable && !item.isSold ? (
                            <form action={moveToCartAction} className="flex-1">
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="listingId"
                                value={item.listingId}
                              />
                              <button
                                type="submit"
                                className="bg-aqua h-9 w-full rounded-8 text-[11px] font-bold text-black"
                              >
                                {t("addToCart")}
                              </button>
                            </form>
                          ) : (
                            <span className="text-caption text-ink-tertiary flex-1">
                              {t("unavailable")}
                            </span>
                          )}

                          <form action={toggleNotifyAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input
                              type="hidden"
                              name="listingId"
                              value={item.listingId}
                            />
                            <input
                              type="hidden"
                              name="notify"
                              value={notifying ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              aria-label={
                                notifying ? t("notifyOff") : t("notifyOn")
                              }
                              title={notifying ? t("notifyOff") : t("notifyOn")}
                              className={`border-line-200 flex size-9 items-center justify-center rounded-8 border ${
                                notifying ? "text-action" : "text-ink-500"
                              }`}
                            >
                              {notifying ? (
                                <Bell className="size-4" aria-hidden />
                              ) : (
                                <BellOff className="size-4" aria-hidden />
                              )}
                            </button>
                          </form>

                          <form action={removeFromWishlistAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input
                              type="hidden"
                              name="listingId"
                              value={item.listingId}
                            />
                            <button
                              type="submit"
                              aria-label={t("remove")}
                              title={t("remove")}
                              className="bg-error-tint text-error flex size-9 items-center justify-center rounded-8"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <Pagination
              page={page}
              total={wishlist.total}
              pageSize={WISHLIST_PAGE_SIZE}
              buildHref={(next) => href({ page: next })}
            />
          </>
        )}
      </div>
    </div>
  );
}

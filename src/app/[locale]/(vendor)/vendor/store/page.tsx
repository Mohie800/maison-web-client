import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSeller, getSellerItems, getSellerReviews } from "@/lib/api/endpoints/sellers";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount, formatPrice } from "@/lib/format/money";

/**
 * Store Profile — `651:14844` light / `651:12254` dark. The seller's own store
 * as a buyer sees it, which is why the frame puts a Preview Mode pill on it.
 *
 * All of it is real: name, handle, bio, the Verified badge and the three
 * counters come from `/sellers/{id}`, the grid from `/sellers/{id}/items`, and
 * the review count from `/sellers/{id}/reviews`.
 *
 * **The banner is a placeholder in the frame too** — there is no banner field on
 * a seller (GAP-116), so the empty state is what the design already draws.
 *
 * The frame's category chips come from the items response's own `categories`
 * rail rather than a store-tags field, which does not exist.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function VendorStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tab = (await searchParams).tab === "about" ? "about" : "products";
  const t = await getTranslations("Vendor.store");
  const activeLocale = (await getLocale()) as Locale;
  const user = await getCurrentUser();

  const [seller, items, reviews] = await Promise.all([
    user ? getSeller(user.id).catch(() => null) : null,
    user ? getSellerItems(user.id, { limit: 12 }).catch(() => null) : null,
    user ? getSellerReviews(user.id, { limit: 1 }).catch(() => null) : null,
  ]);

  const stats = seller?.stats;
  const productCount = stats?.itemsLive ?? stats?.items ?? 0;
  const reviewCount = reviews?.summary?.total ?? 0;
  const initials = (seller?.fullName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatar = resolveMediaUrl(seller?.profilePic);
  const chips = (items?.categories ?? []).map((c) => c.name).filter(Boolean);

  return (
    <>
      {/* TB — 651:14895 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
          {t("title")}
        </h1>
        <Link
          href="/vendor/store/edit"
          className="bg-action text-base flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold"
        >
          {t("edit")}
        </Link>
      </div>

      {/* PB — 651:14900 */}
      <span className="bg-warn-tint3 border-amber-deep text-amber-text flex h-7 w-fit items-center rounded-[13px] border px-3.5 text-[12px]">
        {t("preview")}
      </span>

      {/* Banner — 651:14902. No banner field exists; the frame is a placeholder too. */}
      <div className="bg-vp-action flex h-[180px] items-center justify-center rounded-[16px]">
        <p className="text-ink-500 dark:text-ink-450 text-[13px] font-medium">
          {t("banner")}
        </p>
      </div>

      {/* StoreCard — 651:14904 */}
      <section className="bg-base dark:bg-tint border-line-200 flex flex-wrap items-center gap-5 rounded-[16px] border px-6 py-5">
        <span className="bg-vp-action text-action dark:text-aqua flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-[36px] text-[20px] font-bold">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-ink-900 text-[20px] font-bold" dir="auto">
              {seller?.fullName}
            </p>
            {seller?.isVerified && (
              <span className="bg-vp-action text-action dark:text-aqua flex h-[22px] items-center rounded-[11px] px-2 text-[10px] font-bold">
                ✓ {t("verified")}
              </span>
            )}
          </div>
          {seller?.username && (
            <p className="text-ink-500 dark:text-ink-450 text-[13px]" dir="ltr">
              @{seller.username}
            </p>
          )}
          {seller?.bio && (
            <p className="text-ink-500 dark:text-ink-450 text-[13px]" dir="auto">
              {seller.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-8">
            <Stat
              value={formatCount(stats?.followers ?? 0, activeLocale)}
              label={t("followers")}
            />
            <Stat
              value={Number(stats?.rating ?? 0).toFixed(1)}
              label={t("rating")}
            />
            <Stat
              value={formatCount(productCount, activeLocale)}
              label={t("products")}
            />
          </div>
        </div>

        {/* TC — 651:14924, from the items response's own category rail. */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="bg-fill-100 border-line-200 text-ink-900 flex h-[26px] items-center rounded-[13px] border-[0.5px] px-2.5 text-[11px]"
                dir="auto"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Tabs10 — 651:14935 */}
      <div className="bg-base dark:bg-tint border-line-200 rounded-10 flex h-12 items-center overflow-x-auto border ps-2">
        <Link
          href="/vendor/store"
          aria-current={tab === "products" ? "page" : undefined}
          className={`flex h-12 shrink-0 items-center px-5 text-[13px] ${
            tab === "products"
              ? "text-ink-900 font-semibold"
              : "text-ink-500 dark:text-ink-450"
          }`}
        >
          {t("tabs.products", { count: productCount })}
        </Link>
        <Link
          href="/vendor/reviews"
          className="text-ink-500 dark:text-ink-450 flex h-12 shrink-0 items-center px-5 text-[13px]"
        >
          {t("tabs.reviews", { count: reviewCount })}
        </Link>
        <Link
          href="/vendor/store?tab=about"
          aria-current={tab === "about" ? "page" : undefined}
          className={`flex h-12 shrink-0 items-center px-5 text-[13px] ${
            tab === "about"
              ? "text-ink-900 font-semibold"
              : "text-ink-500 dark:text-ink-450"
          }`}
        >
          {t("tabs.about")}
        </Link>
      </div>

      {tab === "about" ? (
        <section className="bg-base dark:bg-tint border-line-200 rounded-12 border p-4">
          <p className="text-ink-500 dark:text-ink-450 text-[13px]" dir="auto">
            {seller?.aboutText || seller?.bio || t("noAbout")}
          </p>
        </section>
      ) : (items?.items ?? []).length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-12 border px-4 py-8 text-center text-[13px]">
          {t("noProducts")}
        </p>
      ) : (
        /* Grid10 — 651:14942 */
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {(items?.items ?? []).map((item) => {
            const cover = resolveMediaUrl(item.photos?.[0]?.url);
            return (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col overflow-hidden border"
              >
                <span className="bg-fill-100 block h-[140px] w-full overflow-hidden">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={cover}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </span>
                <span className="flex flex-col gap-1 p-2.5">
                  <span
                    className="text-ink-900 truncate text-[12px] font-semibold"
                    dir="auto"
                  >
                    {item.title}
                  </span>
                  <span className="text-action dark:text-aqua text-[13px] font-bold">
                    {formatPrice(item.price, item.currency ?? "SAR")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col gap-[2px]">
      <span className="text-ink-900 text-[18px] font-bold" dir="ltr">
        {value}
      </span>
      <span className="text-ink-500 dark:text-ink-450 text-[11px]">{label}</span>
    </span>
  );
}

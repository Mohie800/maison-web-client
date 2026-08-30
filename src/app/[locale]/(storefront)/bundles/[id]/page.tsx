import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBundle } from "@/lib/api/endpoints/bundles";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { addBundleToBagAction } from "@/features/bundles/actions";
import { startConversationAction } from "@/features/inbox/actions";

/**
 * Bundle detail — Figma `651:5046` (Web_Bundle_Detail).
 *
 * "Add bundle to bag" is real: `POST /bag/items` takes
 * `{ itemType: "bundle", refId }`, so the whole set goes in as one line.
 *
 * "Message seller" has no bundle-level conversation — `POST /{id}/conversations`
 * hangs off a listing — so it opens a thread on the bundle's first item, which
 * is the same seller and gives the thread a product to sit against
 * (plans/09 C50).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getBundle(id).catch(() => null);
  return { title: bundle?.title ?? "Bundle" };
}

export default async function BundleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Bundles");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const added = query.added === "1";

  const bundle = await getBundle(id);
  if (!bundle) notFound();

  const currency = "SAR";
  const items = bundle.items ?? [];
  const gallery = [0, 1, 2, 3].map((i) => {
    const listing = items[i]?.listing;
    return (
      resolveMediaUrl(bundle.coverPhotoUrls?.[i]) ??
      (listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null)
    );
  });
  const handle = bundle.seller?.handle ? `@${bundle.seller.handle}` : null;
  const available = bundle.isAvailable !== false;
  const firstListingId = items[0]?.listingId ?? null;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-6 pb-14 lg:px-20">
        {/* breadcrumb — 651:5060 */}
        <nav className="text-ink-tertiary flex items-center gap-1.5 text-[12px]">
          <Link href="/" className="hover:text-ink">
            {t("home")}
          </Link>
          <ChevronRight className="size-3 rtl:rotate-180" aria-hidden />
          <Link href="/bundles" className="hover:text-ink">
            {t("title")}
          </Link>
          <ChevronRight className="size-3 rtl:rotate-180" aria-hidden />
          <span className="text-ink truncate" dir="auto">
            {bundle.title}
          </span>
        </nav>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* gallery — 651:5061 */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
            {gallery.map((url, index) => (
              <span
                key={index}
                className="bg-tint flex aspect-square items-center justify-center overflow-hidden rounded-12"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <Package className="text-ink-tertiary size-8" aria-hidden />
                )}
              </span>
            ))}
          </div>

          {/* right column — 651:5065 */}
          <div className="flex w-full flex-col lg:w-[292px]">
            <span className="bg-aqua-tint text-success flex h-[22px] w-fit items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px]">
              {t("badge")}
            </span>

            <h1 className="text-ink mt-3 text-[26px] font-bold" dir="auto">
              {bundle.title}
            </h1>
            <p className="text-ink-secondary mt-2 text-[14px]" dir="auto">
              {t("itemsFrom", {
                count: bundle.itemCount ?? items.length,
                handle: handle ?? t("theSeller"),
              })}
            </p>

            {/* price — 651:5069 */}
            <div className="bg-surface mt-4 rounded-[14px] p-5">
              <span className="text-ink-tertiary text-[12px] font-medium">
                {t("bundlePrice")}
              </span>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-ink text-[24px] font-extrabold" dir="ltr">
                  {formatPrice(bundle.bundlePrice, currency)}
                </span>
                {bundle.originalTotal ? (
                  <span
                    className="text-ink-tertiary text-[13px] line-through"
                    dir="ltr"
                  >
                    {formatPrice(bundle.originalTotal, currency)}
                  </span>
                ) : null}
                {bundle.discountPercent ? (
                  <span className="bg-aqua-tint text-success ms-auto flex h-[22px] items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px]">
                    {t("save", { n: bundle.discountPercent })}
                  </span>
                ) : null}
              </div>
            </div>

            <h2 className="text-ink mt-6 text-[15px] font-semibold">
              {t("included")}
            </h2>

            {/* inc — 651:5076 */}
            <ul className="mt-3 flex flex-col gap-2">
              {items.map((item) => {
                const listing = item.listing;
                const photo = listing
                  ? resolveMediaUrl(coverPhotoUrl(listing))
                  : null;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/products/${item.listingId}`}
                      className="bg-base border-line flex h-14 items-center gap-3 rounded-12 border p-[7px]"
                    >
                      <span className="bg-tint flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-8">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                          <img
                            src={photo}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Package
                            className="text-ink-tertiary size-4"
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className="text-ink truncate text-[13px] font-semibold"
                          dir="auto"
                        >
                          {listing?.title ?? t("itemUnavailable")}
                        </span>
                        <span className="text-ink-tertiary text-[11px]">
                          {t("includedRow")}
                        </span>
                      </span>
                      <span
                        className="text-ink shrink-0 text-[13px] font-bold"
                        dir="ltr"
                      >
                        {formatPrice(listing?.price, currency)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {added && (
              <p className="bg-action-tint text-action mt-4 rounded-10 p-3 text-[13px] font-medium">
                {t("addedBanner")}
              </p>
            )}
            {error && (
              <p className="bg-error-tint text-error mt-4 rounded-10 p-3 text-[13px] font-medium">
                {t(`errors.${error}`)}
              </p>
            )}

            {/* btn/primary — 651:5096 */}
            {available ? (
              <form action={addBundleToBagAction} className="mt-5">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="bundleId" value={bundle.id} />
                <button
                  type="submit"
                  className="bg-aqua text-on-accent h-13 w-full rounded-12 text-[14px] font-semibold"
                >
                  {t("addToBag")}
                </button>
              </form>
            ) : (
              <p className="bg-fill-100 text-ink-500 mt-5 flex h-13 items-center justify-center rounded-12 text-[14px] font-semibold">
                {t("unavailable")}
              </p>
            )}

            {/* btn/secondary — 651:5098 */}
            {firstListingId && (
              <form action={startConversationAction} className="mt-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="listingId" value={firstListingId} />
                <button
                  type="submit"
                  className="bg-base border-line text-ink h-[46px] w-full rounded-12 border text-[14px] font-semibold"
                >
                  {t("messageSeller")}
                </button>
              </form>
            )}

            <p className="text-ink-tertiary mt-5 text-[12px]">{t("terms")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trash2, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBag } from "@/lib/api/endpoints/checkout";
import { resolveMediaUrl } from "@/lib/api/media";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { formatPrice } from "@/lib/format/money";
import { Checkbox } from "@/components/ui/checkbox";
import {
  clearBag,
  removeBagItem,
  toggleBagItem,
} from "@/features/checkout/actions";

/**
 * Cart — Figma nodes 651:7423 (Web_Cart) and 651:7507 (Web_Empty_Cart).
 *
 * Gated by proxy.ts. Mutations are Server Actions submitted as plain forms, so
 * the cart works without JavaScript.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout");
  const bag = await getBag();

  if (bag.items.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-14 lg:px-20">
        <div className="border-line mx-auto flex max-w-[520px] flex-col items-center gap-4 rounded-16 border p-14 text-center">
          <ShoppingBag className="text-ink-tertiary size-10" aria-hidden />
          <h1 className="text-h2">{t("emptyTitle")}</h1>
          <p className="text-body text-ink-secondary">{t("emptyBody")}</p>
          <Link
            href="/products"
            className="bg-aqua text-on-accent text-label mt-2 flex h-12 items-center rounded-[24px] px-6 font-semibold"
          >
            {t("startShopping")}
          </Link>
        </div>
      </div>
    );
  }

  const selectedCount = bag.items.filter((item) => item.selected).length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-h1">{t("cartTitle")}</h1>
        <form action={clearBag}>
          <button type="submit" className="text-caption text-error">
            {t("clearBag")}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row">
        <ul className="flex min-w-0 flex-1 flex-col gap-4">
          {bag.items.map((item) => {
            const listing = item.listing;
            const image = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;
            /**
             * `priceSnapshot` is what the buyer will pay — the price captured
             * when the item was added. Showing the live listing price instead
             * would misstate the total when a seller has since repriced.
             */
            const price = item.priceSnapshot ?? listing?.price;

            return (
              <li
                key={item.id}
                className="bg-base border-line flex gap-4 rounded-12 border p-4"
              >
                {/*
                  Selection is a form submit rather than a controlled input, so
                  it works without JavaScript. The checkbox is decorative here;
                  the label wraps a submit button.
                */}
                <form action={toggleBagItem} className="flex items-center">
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    aria-label={item.selected ? t("deselect") : t("select")}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={item.selected}
                      aria-hidden
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                  </button>
                </form>

                <Link
                  href={listing ? `/products/${listing.id}` : "/products"}
                  className="bg-surface size-24 shrink-0 overflow-hidden rounded-8"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={listing ? `/products/${listing.id}` : "/products"}
                    dir="auto"
                    className="text-label line-clamp-2"
                  >
                    {listing?.title ?? t("itemUnavailable")}
                  </Link>
                  {item.itemType === "bundle" && (
                    <span className="text-caption text-ink-tertiary">
                      {t("bundle")}
                    </span>
                  )}
                  <span className="text-h3 mt-auto">
                    {formatPrice(price, listing?.currency ?? "SAR")}
                  </span>
                </div>

                <form action={removeBagItem} className="shrink-0">
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    aria-label={t("remove")}
                    className="text-ink-tertiary hover:text-error"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <aside className="bg-surface border-line h-fit rounded-16 border p-6 lg:w-[360px] lg:shrink-0">
          <h2 className="text-h3 mb-4">{t("summary")}</h2>

          <dl className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-caption text-ink-secondary">
                {t("selectedItems", { count: selectedCount })}
              </dt>
              <dd className="text-caption">
                {formatPrice(bag.selectedTotal)}
              </dd>
            </div>
            <p className="text-caption text-ink-tertiary">
              {t("totalsAtCheckout")}
            </p>
          </dl>

          {selectedCount === 0 ? (
            <p className="text-caption text-error mt-5">{t("selectSomething")}</p>
          ) : (
            <Link
              href="/checkout/shipping"
              className="bg-aqua text-on-accent text-label mt-5 flex h-12 items-center justify-center rounded-[24px] font-semibold"
            >
              {t("checkout")}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, ShieldCheck, Undo2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBag } from "@/lib/api/endpoints/checkout";
import { formatPrice } from "@/lib/format/money";
import { clearBag, validateCoupon } from "@/features/checkout/actions";
import { CartList } from "@/features/checkout/components/cart-list";
import { EmptyCart } from "@/features/checkout/components/empty-cart";

/**
 * Cart — Figma nodes 651:7423 (Web_Cart) and 651:7507 (Web_Empty_Cart).
 *
 * Gated by proxy.ts. Mutations are Server Actions submitted as plain forms, so
 * the cart works without JavaScript.
 *
 * The design's summary also carries a "Platform fee (1%)" row. It is not
 * rendered: the fee is 15% and it is charged to the seller, not added to what
 * the buyer pays. See plans/09 C22.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout");
  const query = await searchParams;
  const bag = await getBag();

  if (bag.items.length === 0) return <EmptyCart />;

  const selected = bag.items.filter((item) => item.selected);
  const couponCode = firstParam(query.coupon);

  /**
   * The cart has no address yet, so there is no checkout preview to price a
   * coupon against. `POST /coupons/validate` takes a subtotal instead, which the
   * bag already reports — so the code can be checked here and carried into
   * checkout, where the preview applies it for real.
   */
  const coupon =
    couponCode && selected.length > 0
      ? await validateCoupon(couponCode, Number(bag.selectedTotal ?? 0))
      : null;

  const checkoutHref = couponCode
    ? `/checkout/shipping?coupon=${encodeURIComponent(couponCode)}`
    : "/checkout/shipping";

  return (
    <div className="bg-surface min-h-full">
      <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-h1">{t("cartTitle")}</h1>
          <span className="bg-tint text-caption text-ink-secondary rounded-full px-3 py-1">
            {t("itemCount", { count: bag.items.length })}
          </span>
          <form action={clearBag} className="ms-auto">
            <button type="submit" className="text-caption text-error">
              {t("clearBag")}
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <CartList items={bag.items} />

            <div className="bg-base border-line rounded-12 border p-4">
              <form action={`/${locale}/cart`} className="flex gap-3">
                <input
                  name="coupon"
                  defaultValue={couponCode}
                  placeholder={t("couponPlaceholder")}
                  dir="ltr"
                  className="border-line bg-surface text-body placeholder:text-ink-tertiary focus:border-focus h-11 min-w-0 flex-1 rounded-8 border px-3 outline-none"
                />
                <button
                  type="submit"
                  className="bg-invert text-label h-11 shrink-0 rounded-8 px-6 font-semibold text-white"
                >
                  {t("apply")}
                </button>
              </form>

              {coupon && (
                <p
                  className={`text-caption mt-2 ${
                    coupon.valid ? "text-action" : "text-error"
                  }`}
                >
                  {coupon.valid
                    ? t("couponWillApply", {
                        amount: formatPrice(coupon.discountAmount),
                      })
                    : (coupon.message ?? t("couponInvalid"))}
                </p>
              )}
            </div>
          </div>

          <aside className="bg-base h-fit rounded-16 p-5 lg:w-[360px] lg:shrink-0">
            <h2 className="text-body-lg font-bold">{t("summary")}</h2>
            <hr className="border-line my-4 border-0 border-t" />

            <dl className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-body text-ink-secondary">
                  {t("selectedItems", { count: selected.length })}
                </dt>
                <dd className="text-body">{formatPrice(bag.selectedTotal)}</dd>
              </div>
              <p className="text-caption text-ink-tertiary">
                {t("totalsAtCheckout")}
              </p>
            </dl>

            <hr className="border-line my-4 border-0 border-t" />

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-label">{t("total")}</span>
              <span className="text-h3">{formatPrice(bag.selectedTotal)}</span>
            </div>

            {selected.length === 0 ? (
              <p className="text-caption text-error mt-5">
                {t("selectSomething")}
              </p>
            ) : (
              <Link
                href={checkoutHref}
                className="bg-aqua text-on-accent text-label mt-5 flex h-12 items-center justify-center rounded-[24px] font-semibold"
              >
                {t("proceedToCheckout")}
              </Link>
            )}

            <ul className="mt-5 flex flex-col gap-2">
              <TrustRow icon={<ShieldCheck className="size-3.5" aria-hidden />}>
                {t("trustSecure")}
              </TrustRow>
              <TrustRow icon={<Check className="size-3.5" aria-hidden />}>
                {t("trustProtection")}
              </TrustRow>
              <TrustRow icon={<Undo2 className="size-3.5" aria-hidden />}>
                {t("trustReturns")}
              </TrustRow>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TrustRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="text-caption text-ink-secondary flex items-center gap-2">
      <span className="text-action">{icon}</span>
      {children}
    </li>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

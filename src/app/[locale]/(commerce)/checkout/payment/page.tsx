import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CreditCard, Plus, Trash2, HeartHandshake } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getBag,
  getCharities,
  getPaymentMethods,
  previewCheckout,
} from "@/lib/api/endpoints/checkout";
import { formatPrice } from "@/lib/format/money";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import { PaymentMethodForm } from "@/features/checkout/components/payment-method-form";
import { placeOrder, removePaymentMethod } from "@/features/checkout/actions";
import type { ShipmentSelection } from "@/lib/api/schemas/checkout";

/**
 * Checkout step 2 — payment method, coupon, charity donation, place order.
 * Figma nodes 651:7740, 651:7841, 651:7932.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function PaymentPage({
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

  const addressId = firstParam(query.addressId);
  if (!addressId) redirect("/checkout/shipping");

  const shipments = parseShipments(firstParam(query.shipments));
  const couponCode = firstParam(query.coupon);
  const charityId = firstParam(query.charityId);
  const donationAmount = Number(firstParam(query.donation) ?? "0");

  const [bag, methods, charities] = await Promise.all([
    getBag(),
    getPaymentMethods(),
    getCharities(),
  ]);

  if (bag.items.filter((i) => i.selected).length === 0) redirect("/cart");

  /**
   * Re-previewed on every change (coupon, donation, shipping) so the totals
   * shown are always the ones the server will charge. The coupon is applied here
   * rather than validated separately: `checkout/preview` reports the real
   * discount against the real basket, where `POST /coupons/validate` only checks
   * a code against a subtotal we'd have to compute ourselves.
   */
  const preview = await previewCheckout({
    addressId,
    shipments,
    ...(couponCode ? { couponCode } : {}),
    ...(donationAmount > 0 && charityId
      ? { donationAmount, charityId }
      : {}),
  });

  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
  const ehsan = charities[0];
  const suggested = Number(preview.suggestedDonationAmount ?? 0);
  const donationOn = donationAmount > 0;

  const baseQuery = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    p.set("addressId", addressId);
    if (shipments?.length) p.set("shipments", JSON.stringify(shipments));
    if (couponCode) p.set("coupon", couponCode);
    if (charityId) p.set("charityId", charityId);
    if (donationAmount > 0) p.set("donation", String(donationAmount));
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    return `/checkout/payment?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <CheckoutSteps current="payment" />

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <section>
            <h2 className="text-h3 mb-4">{t("paymentMethod")}</h2>

            {methods.length === 0 ? (
              <p className="text-body text-ink-secondary mb-4">
                {t("noPaymentMethods")}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {methods.map((method) => {
                  const active = method.id === defaultMethod?.id;
                  return (
                    <li
                      key={method.id}
                      className={`flex items-center gap-3 rounded-12 border p-4 ${
                        active ? "border-action bg-action-tint" : "border-line"
                      }`}
                    >
                      <CreditCard className="text-ink-secondary size-5" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-label">
                          {t(`paymentTypes.${method.type}`, {
                            fallback: method.type,
                          })}
                          {method.last4 && (
                            <span className="text-ink-tertiary ms-2" dir="ltr">
                              •••• {method.last4}
                            </span>
                          )}
                        </span>
                        {method.walletPhone && (
                          <span className="text-caption text-ink-tertiary" dir="ltr">
                            {method.walletPhone}
                          </span>
                        )}
                      </span>
                      {active && <Check className="text-action size-4" aria-hidden />}
                      <form action={removePaymentMethod}>
                        <input type="hidden" name="id" value={method.id} />
                        <button
                          type="submit"
                          aria-label={t("remove")}
                          className="text-ink-tertiary hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}

            <details className="border-line mt-4 rounded-12 border p-4">
              <summary className="text-label text-action flex cursor-pointer items-center gap-2">
                <Plus className="size-4" aria-hidden />
                {t("addPaymentMethod")}
              </summary>
              <div className="mt-4">
                <PaymentMethodForm />
              </div>
            </details>
          </section>

          <section>
            <h2 className="text-h3 mb-4">{t("coupon")}</h2>
            {/*
              GET form: the code lands in the URL and the page re-previews, so
              the discount shown is the server's, not a guess.
            */}
            <form action={`/${locale}/checkout/payment`} className="flex gap-3">
              <input type="hidden" name="addressId" value={addressId} />
              {shipments?.length ? (
                <input
                  type="hidden"
                  name="shipments"
                  value={JSON.stringify(shipments)}
                />
              ) : null}
              <input
                name="coupon"
                defaultValue={couponCode}
                placeholder={t("couponPlaceholder")}
                dir="ltr"
                className="border-line bg-base text-body h-12 flex-1 rounded-12 border px-4 outline-none focus:border-focus"
              />
              <button
                type="submit"
                className="border-ink text-label h-12 rounded-12 border px-5 font-semibold"
              >
                {t("apply")}
              </button>
            </form>

            {couponCode && (
              <p
                className={`text-caption mt-2 ${
                  Number(preview.discountAmount) > 0 ? "text-action" : "text-error"
                }`}
              >
                {Number(preview.discountAmount) > 0
                  ? t("couponApplied", {
                      amount: formatPrice(preview.discountAmount),
                    })
                  : t("couponInvalid")}
              </p>
            )}
          </section>

          {ehsan && suggested > 0 && (
            <section>
              <h2 className="text-h3 mb-2 flex items-center gap-2">
                <HeartHandshake className="text-action size-5" aria-hidden />
                {t("donateTitle", { charity: ehsan.name })}
              </h2>
              <p className="text-caption text-ink-secondary mb-4">
                {t("donateBody")}
              </p>

              <div className="flex gap-3">
                <Link
                  href={baseQuery({
                    charityId: ehsan.id,
                    donation: String(suggested),
                  })}
                  className={`text-label flex h-11 items-center rounded-[22px] border px-5 ${
                    donationOn
                      ? "border-action bg-action-tint text-action font-semibold"
                      : "border-line"
                  }`}
                >
                  {t("donateAmount", { amount: formatPrice(String(suggested)) })}
                </Link>
                {donationOn && (
                  <Link
                    href={baseQuery({ donation: undefined, charityId: undefined })}
                    className="text-label border-line flex h-11 items-center rounded-[22px] border px-5"
                  >
                    {t("removeDonation")}
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        <OrderSummary
          preview={preview}
          action={
            <form action={placeOrder} className="flex flex-col gap-3">
              <input type="hidden" name="addressId" value={addressId} />
              <input
                type="hidden"
                name="shipments"
                value={JSON.stringify(shipments ?? [])}
              />
              {defaultMethod && (
                <input
                  type="hidden"
                  name="paymentMethodId"
                  value={defaultMethod.id}
                />
              )}
              {couponCode && (
                <input type="hidden" name="couponCode" value={couponCode} />
              )}
              {donationOn && charityId && (
                <>
                  <input type="hidden" name="charityId" value={charityId} />
                  <input
                    type="hidden"
                    name="donationAmount"
                    value={String(donationAmount)}
                  />
                </>
              )}

              <button
                type="submit"
                disabled={!defaultMethod}
                className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold disabled:opacity-50"
              >
                {t("placeOrder", {
                  amount: formatPrice(preview.totalAmount, preview.currency ?? "SAR"),
                })}
              </button>

              {!defaultMethod && (
                <p className="text-caption text-error text-center">
                  {t("addPaymentFirst")}
                </p>
              )}
            </form>
          }
        />
      </div>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

function parseShipments(raw: string | undefined): ShipmentSelection[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

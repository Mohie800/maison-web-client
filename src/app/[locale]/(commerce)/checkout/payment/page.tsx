import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getBag,
  getCharities,
  getPaymentMethods,
  previewCheckout,
} from "@/lib/api/endpoints/checkout";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { formatPrice } from "@/lib/format/money";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import { PaymentMethodList } from "@/features/checkout/components/payment-method-list";
import { OtherPaymentMethods } from "@/features/checkout/components/other-payment-methods";
import { NewPaymentForm } from "@/features/checkout/components/new-payment-form";
import { CouponCard } from "@/features/checkout/components/coupon-card";
import { DonationCard } from "@/features/checkout/components/donation-card";
import {
  CardDivider,
  CheckoutCard,
  CheckoutLineItem,
  CheckoutPage,
  InlineBreakdown,
  SectionLabel,
  SecurityNote,
  primaryCta,
} from "@/features/checkout/components/checkout-shell";
import { placeOrder, validateCoupon } from "@/features/checkout/actions";
import {
  PAYMENT_TYPES,
  type PaymentType,
  type ShipmentSelection,
} from "@/lib/api/schemas/checkout";

/**
 * Checkout step 2 — payment method, coupon, charity donation, place order.
 * Figma nodes 651:7740, 651:7841, 651:7932.
 *
 * `?add={type}` swaps the card for the Add New Card screen, which pays in the
 * same submit rather than saving a method first — see `NewPaymentForm`.
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

  const shipments = parseShipments(firstParam(query.shipments)) ?? [];
  const couponCode = firstParam(query.coupon);
  const charityId = firstParam(query.charityId);
  const donationAmount = Number(firstParam(query.donation) ?? "0");

  const [bag, methods, charities] = await Promise.all([
    getBag(),
    getPaymentMethods(),
    getCharities(),
  ]);

  const selected = bag.items.filter((i) => i.selected);
  if (selected.length === 0) redirect("/cart");

  const ehsan = charities[0];

  /**
   * Two previews, in parallel, when a donation is applied.
   *
   * The first is what the buyer will actually be charged. The second is the same
   * basket without the donation, which is the only honest way to show the
   * design's "your total goes from X to Y" line — the alternative is doing money
   * arithmetic in the browser, which is how a checkout ends up displaying a
   * different number than it charges.
   */
  const base = {
    addressId,
    shipments,
    ...(couponCode ? { couponCode } : {}),
  };
  const donationOn = donationAmount > 0 && Boolean(charityId);

  const [preview, withoutDonation] = await Promise.all([
    previewCheckout({
      ...base,
      ...(donationOn ? { donationAmount, charityId } : {}),
    }),
    donationOn
      ? previewCheckout(base).catch(() => null)
      : Promise.resolve(null),
  ]);

  const currency = preview.currency ?? "SAR";
  const suggested = Number(preview.suggestedDonationAmount ?? 0);

  /**
   * The coupon's own name and description only come back from
   * `POST /coupons/validate`; the preview reports the discount but not what
   * granted it. Non-fatal — the applied panel loses its subtitle, not its figure.
   */
  const coupon = couponCode
    ? await validateCoupon(couponCode, Number(preview.subtotalAmount ?? 0))
    : null;

  const carry = (extra: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    p.set("addressId", addressId);
    if (shipments.length) p.set("shipments", JSON.stringify(shipments));
    if (couponCode) p.set("coupon", couponCode);
    if (charityId) p.set("charityId", charityId);
    if (donationAmount > 0) p.set("donation", String(donationAmount));
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined) p.delete(key);
      else p.set(key, value);
    }
    return `/checkout/payment?${p.toString()}`;
  };

  const breakdownRows = [
    {
      label: t("subtotalWithCount", { count: selected.length }),
      value: formatPrice(preview.subtotalAmount, currency),
    },
    {
      label: t("shipping"),
      value: formatPrice(preview.shippingAmount, currency),
    },
    { label: t("vat"), value: formatPrice(preview.vatAmount, currency) },
    ...(Number(preview.discountAmount ?? 0) > 0
      ? [
          {
            label: couponCode
              ? t("discountWithCode", { code: couponCode })
              : t("discount"),
            value: `−${formatPrice(preview.discountAmount, currency)}`,
            tone: "text-error",
          },
        ]
      : []),
    ...(Number(preview.donationAmount ?? 0) > 0
      ? [
          {
            label: ehsan
              ? t("donationTo", { charity: ehsan.name })
              : t("donation"),
            value: `+${formatPrice(preview.donationAmount, currency)}`,
            tone: "text-action",
          },
        ]
      : []),
  ];

  /* ------------------------------------------------ add-a-method state */

  const adding = firstParam(query.add);
  if (adding && (PAYMENT_TYPES as readonly string[]).includes(adding)) {
    return (
      <>
        <CheckoutSteps current="payment" />
        <CheckoutPage>
          <CheckoutCard
            title={adding === "stc_pay" ? t("payWithStc") : t("addNewCard")}
          >
            <ul className="mb-6 flex flex-col gap-3">
              {selected.map((item) => (
                <CheckoutLineItem
                  key={item.id}
                  title={item.listing?.title ?? t("itemUnavailable")}
                  price={item.priceSnapshot ?? item.listing?.price ?? null}
                  currency={item.listing?.currency ?? currency}
                  image={item.listing ? coverPhotoUrl(item.listing) : null}
                />
              ))}
            </ul>

            <NewPaymentForm
              type={adding as PaymentType}
              preview={preview}
              addressId={addressId}
              shipments={shipments}
              couponCode={couponCode}
              charityId={charityId}
              donationAmount={donationOn ? donationAmount : undefined}
              cancelHref={carry({ add: undefined })}
              breakdown={
                <div className="mt-2">
                  <SectionLabel>{t("orderBreakdown")}</SectionLabel>
                  <InlineBreakdown
                    rows={breakdownRows}
                    totalLabel={t("total")}
                    totalValue={formatPrice(preview.totalAmount, currency)}
                  />
                </div>
              }
            />
          </CheckoutCard>

          <OrderSummary
            preview={preview}
            itemCount={selected.length}
            couponCode={couponCode}
            charityName={donationOn ? ehsan?.name : null}
          />
        </CheckoutPage>
      </>
    );
  }

  /* ------------------------------------------------------------ the step */

  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];


  return (
    <>
      <CheckoutSteps current="payment" />
      <CheckoutPage>
        <CheckoutCard title={t("paymentTitle")}>
          <ul className="flex flex-col gap-3">
            {selected.map((item) => (
              <CheckoutLineItem
                key={item.id}
                title={item.listing?.title ?? t("itemUnavailable")}
                price={item.priceSnapshot ?? item.listing?.price ?? null}
                currency={item.listing?.currency ?? currency}
                image={item.listing ? coverPhotoUrl(item.listing) : null}
              />
            ))}
          </ul>

          <CardDivider />

          <SectionLabel>{t("savedPaymentMethod")}</SectionLabel>
          <PaymentMethodList
            methods={methods}
            selectedId={defaultMethod?.id}
            addCardHref={carry({ add: "card" })}
          />

          <CardDivider />

          <SectionLabel>{t("otherPaymentMethods")}</SectionLabel>
          <OtherPaymentMethods hrefFor={(type) => carry({ add: type })} />

          {ehsan && (
            <>
              <CardDivider />
              <DonationCard
                charityName={ehsan.name}
                suggested={suggested}
                selected={donationOn ? donationAmount : 0}
                totalWithout={withoutDonation?.totalAmount ?? null}
                totalWith={preview.totalAmount}
                currency={currency}
                hrefFor={(amount) =>
                  carry({ charityId: ehsan.id, donation: String(amount) })
                }
                offHref={carry({ charityId: undefined, donation: undefined })}
              />
            </>
          )}

          <CardDivider />

          <CouponCard
            action={`/${locale}/checkout/payment`}
            hiddenFields={{
              addressId,
              ...(shipments.length
                ? { shipments: JSON.stringify(shipments) }
                : {}),
              ...(charityId ? { charityId } : {}),
              ...(donationAmount > 0 ? { donation: String(donationAmount) } : {}),
            }}
            code={couponCode}
            discountAmount={preview.discountAmount}
            description={coupon?.message}
            currency={currency}
          />

          <CardDivider />

          <SectionLabel>{t("orderBreakdown")}</SectionLabel>
          <InlineBreakdown
            rows={breakdownRows}
            totalLabel={t("total")}
            totalValue={formatPrice(preview.totalAmount, currency)}
          />

          <form action={placeOrder} className="mt-6">
            <input type="hidden" name="addressId" value={addressId} />
            <input
              type="hidden"
              name="shipments"
              value={JSON.stringify(shipments)}
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
              className={primaryCta("disabled:opacity-50")}
            >
              {t("payAmount", {
                amount: formatPrice(preview.totalAmount, currency),
              })}
            </button>
          </form>

          {!defaultMethod && (
            <p className="text-caption text-error mt-2 text-center">
              {t("addPaymentFirst")}
            </p>
          )}

          <SecurityNote variant="payment" />
        </CheckoutCard>

        <OrderSummary
          preview={preview}
          itemCount={selected.length}
          couponCode={couponCode}
          charityName={donationOn ? ehsan?.name : null}
        />
      </CheckoutPage>
    </>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

function parseShipments(
  raw: string | undefined,
): ShipmentSelection[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

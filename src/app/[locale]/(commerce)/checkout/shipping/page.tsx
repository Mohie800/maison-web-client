import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getAddresses,
  getBag,
  previewCheckout,
} from "@/lib/api/endpoints/checkout";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format/money";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import { AddressForm } from "@/features/checkout/components/address-form";
import { AddressList } from "@/features/checkout/components/address-list";
import { ShippingMethods } from "@/features/checkout/components/shipping-methods";
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
import type { Locale } from "@/i18n/routing";
import type { ShipmentSelection } from "@/lib/api/schemas/checkout";

/**
 * Checkout step 1 — shipping address and per-seller delivery option.
 * Figma nodes 651:7551 and 651:7667.
 *
 * `?edit=new` and `?edit={id}` swap the card for the address form, which is how
 * the design moves between `01_Shipping_SavedAddress` and
 * `02_Shipping_EditAddress`.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function ShippingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;

  const [bag, addresses] = await Promise.all([getBag(), getAddresses()]);

  const selected = bag.items.filter((i) => i.selected);
  // Nothing selected means nothing to check out — don't show an empty flow.
  if (selected.length === 0) redirect("/cart");

  const couponCode = firstParam(query.coupon);
  const addressId =
    firstParam(query.addressId) ??
    addresses.find((a) => a.isDefault)?.id ??
    addresses[0]?.id;

  const editing = firstParam(query.edit);
  const carry = (extra: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    if (addressId) p.set("addressId", addressId);
    if (couponCode) p.set("coupon", couponCode);
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined) p.delete(key);
      else p.set(key, value);
    }
    const qs = p.toString();
    return qs ? `/checkout/shipping?${qs}` : "/checkout/shipping";
  };

  /* -------------------------------------------------- address form state */

  if (editing) {
    const address =
      editing === "new" ? undefined : addresses.find((a) => a.id === editing);

    // The design keeps the totals rail alongside the form (`651:7667`).
    const railPreview = addressId
      ? await previewCheckout({ addressId, ...(couponCode ? { couponCode } : {}) }).catch(
          () => null,
        )
      : null;

    return (
      <>
        <CheckoutSteps current="shipping" />
        <CheckoutPage>
          <CheckoutCard title={address ? t("editAddress") : t("newAddress")}>
            <AddressForm address={address} cancelHref={carry()} />
          </CheckoutCard>

          {railPreview && (
            <OrderSummary
              preview={railPreview}
              itemCount={selected.length}
              couponCode={couponCode}
            />
          )}
        </CheckoutPage>
      </>
    );
  }

  /* ------------------------------------------------------------ the step */

  /**
   * The preview is the only place that knows the seller grouping and the
   * shipping options available per group, so it drives this screen even before
   * the buyer has chosen anything.
   */
  const preview = addressId
    ? await previewCheckout({
        addressId,
        shipments: parseShipments(firstParam(query.shipments)),
        ...(couponCode ? { couponCode } : {}),
      })
    : null;

  const currency = preview?.currency ?? "SAR";
  const groups = preview?.sellerGroups ?? [];
  const shipments: ShipmentSelection[] = groups
    .map((group) => ({
      sellerId: group.sellerId,
      shippingOptionId: group.chosenShippingOptionId ?? "",
    }))
    .filter((s) => s.shippingOptionId);

  /** Swapping one group's option while leaving the others as they are. */
  const optionHref = (sellerId: string, optionId: string) => {
    const next = groups.map((g) => ({
      sellerId: g.sellerId,
      shippingOptionId:
        g.sellerId === sellerId ? optionId : (g.chosenShippingOptionId ?? ""),
    }));
    return carry({
      shipments: JSON.stringify(next.filter((s) => s.shippingOptionId)),
    });
  };

  /** The design names the chosen method in the rail when one covers the order. */
  const chosenNames = new Set(
    groups.map((group) => {
      const option = group.availableShippingOptions.find(
        (o) => o.id === group.chosenShippingOptionId,
      );
      return option ? pickLocalized(option, "name", activeLocale) : "";
    }),
  );
  const shippingLabel = chosenNames.size === 1 ? [...chosenNames][0] : null;

  const paymentParams = new URLSearchParams();
  if (addressId) paymentParams.set("addressId", addressId);
  paymentParams.set("shipments", JSON.stringify(shipments));
  if (couponCode) paymentParams.set("coupon", couponCode);
  const paymentHref = `/checkout/payment?${paymentParams.toString()}`;

  const breakdownRows = [
    {
      label: t("subtotalWithCount", { count: selected.length }),
      value: formatPrice(preview?.subtotalAmount, currency),
    },
    {
      label: shippingLabel || t("shipping"),
      value: formatPrice(preview?.shippingAmount, currency),
    },
    ...(Number(preview?.discountAmount ?? 0) > 0
      ? [
          {
            label: couponCode
              ? t("discountWithCode", { code: couponCode })
              : t("discount"),
            value: `−${formatPrice(preview?.discountAmount, currency)}`,
            tone: "text-error",
          },
        ]
      : []),
    { label: t("vat"), value: formatPrice(preview?.vatAmount, currency) },
  ];

  return (
    <>
      <CheckoutSteps current="shipping" />
      <CheckoutPage>
        <CheckoutCard title={t("shippingTitle")}>
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

          <SectionLabel>{t("deliveryAddress")}</SectionLabel>
          <AddressList
            addresses={addresses}
            selectedId={addressId}
            editHref={(id) => carry({ edit: id })}
            addHref={carry({ edit: "new" })}
          />

          {groups.length > 0 && (
            <>
              <CardDivider />
              <SectionLabel>{t("shippingMethod")}</SectionLabel>

              {groups.length > 1 && (
                <p className="text-caption text-ink-secondary mb-3">
                  {t("multiSellerNote", { count: groups.length })}
                </p>
              )}

              <div className="flex flex-col gap-5">
                {groups.map((group, index) => (
                  <div key={group.sellerId}>
                    {groups.length > 1 && (
                      <p className="text-label mb-2">
                        {t("package", { index: index + 1 })}
                        <span className="text-caption text-ink-tertiary ms-2">
                          {t("itemsInPackage", { count: group.items.length })}
                        </span>
                      </p>
                    )}
                    {group.shippingPayer === "included_in_price" && (
                      <p className="text-caption text-action mb-2">
                        {t("shippingCoveredBySeller")}
                      </p>
                    )}
                    <ShippingMethods
                      options={group.availableShippingOptions}
                      chosenId={group.chosenShippingOptionId}
                      hrefFor={(optionId) => optionHref(group.sellerId, optionId)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {preview ? (
            <>
              <CardDivider />
              <SectionLabel>{t("priceBreakdown")}</SectionLabel>
              <InlineBreakdown
                rows={breakdownRows}
                totalLabel={t("total")}
                totalValue={formatPrice(preview.totalAmount, currency)}
              />

              <Link href={paymentHref} className={primaryCta("mt-6")}>
                {t("continueToPayment")}
              </Link>
              <SecurityNote variant="shipping" />
            </>
          ) : (
            <p className="text-body text-ink-secondary mt-6">
              {t("addAddressFirst")}
            </p>
          )}
        </CheckoutCard>

        {preview && (
          <OrderSummary
            preview={preview}
            itemCount={selected.length}
            shippingLabel={shippingLabel}
            couponCode={couponCode}
          />
        )}
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

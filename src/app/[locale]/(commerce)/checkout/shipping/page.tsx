import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Check, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getAddresses,
  getBag,
  previewCheckout,
} from "@/lib/api/endpoints/checkout";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format/money";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import { AddressForm } from "@/features/checkout/components/address-form";
import { setDefaultAddress } from "@/features/checkout/actions";
import type { Locale } from "@/i18n/routing";

/**
 * Checkout step 1 — shipping address and per-seller delivery option.
 * Figma nodes 651:7551 and 651:7667.
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

  // Nothing selected means nothing to check out — don't show an empty flow.
  if (bag.items.filter((i) => i.selected).length === 0) redirect("/cart");

  const addressId =
    firstParam(query.addressId) ??
    addresses.find((a) => a.isDefault)?.id ??
    addresses[0]?.id;

  /**
   * The preview is the only place that knows the seller grouping and the
   * shipping options available per group, so it drives this screen even before
   * the buyer has chosen anything.
   */
  const preview = addressId
    ? await previewCheckout({ addressId, shipments: parseShipments(query) })
    : null;

  const shipments = (preview?.sellerGroups ?? [])
    .map((group) => ({
      sellerId: group.sellerId,
      shippingOptionId: group.chosenShippingOptionId ?? "",
    }))
    .filter((s) => s.shippingOptionId);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <CheckoutSteps current="shipping" />

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <section>
            <h2 className="text-h3 mb-4">{t("deliverTo")}</h2>

            {addresses.length === 0 ? (
              <p className="text-body text-ink-secondary mb-4">
                {t("noAddresses")}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {addresses.map((address) => {
                  const active = address.id === addressId;
                  return (
                    <li key={address.id}>
                      <form action={setDefaultAddress}>
                        <input type="hidden" name="id" value={address.id} />
                        <button
                          type="submit"
                          className={`w-full rounded-12 border p-4 text-start ${
                            active ? "border-action bg-action-tint" : "border-line"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-label">
                              {address.label || address.recipientName}
                            </span>
                            {active && (
                              <Check className="text-action size-4" aria-hidden />
                            )}
                          </span>
                          <span className="text-caption text-ink-secondary mt-1 block">
                            {[
                              address.recipientName,
                              address.street,
                              address.area,
                              address.city,
                              address.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                          <span className="text-caption text-ink-tertiary block" dir="ltr">
                            {address.phone}
                          </span>
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
                {t("addAddress")}
              </summary>
              <div className="mt-4">
                <AddressForm />
              </div>
            </details>
          </section>

          {preview && preview.sellerGroups.length > 0 && (
            <section>
              <h2 className="text-h3 mb-2">{t("delivery")}</h2>
              {/*
                Checkout is multi-seller: one bag can produce several orders, and
                each seller group gets its own shipping choice.
              */}
              <p className="text-caption text-ink-secondary mb-4">
                {t("multiSellerNote", { count: preview.sellerGroups.length })}
              </p>

              <ul className="flex flex-col gap-5">
                {preview.sellerGroups.map((group, index) => (
                  <li
                    key={group.sellerId}
                    className="border-line rounded-12 border p-4"
                  >
                    <p className="text-label mb-3">
                      {t("package", { index: index + 1 })}
                      <span className="text-caption text-ink-tertiary ms-2">
                        {t("itemsInPackage", { count: group.items.length })}
                      </span>
                    </p>

                    <ul className="mb-4 flex flex-col gap-1">
                      {group.items.map((item) => (
                        <li
                          key={item.bagItemId}
                          className="text-caption text-ink-secondary flex justify-between gap-4"
                        >
                          <span className="truncate" dir="auto">
                            {item.title}
                          </span>
                          <span className="shrink-0">
                            {formatPrice(item.price, preview.currency ?? "SAR")}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-2">
                      {group.availableShippingOptions.map((option) => {
                        const active = option.id === group.chosenShippingOptionId;
                        const href = shippingHref(
                          addressId,
                          preview.sellerGroups.map((g) => ({
                            sellerId: g.sellerId,
                            shippingOptionId:
                              g.sellerId === group.sellerId
                                ? option.id
                                : (g.chosenShippingOptionId ?? ""),
                          })),
                        );
                        return (
                          <Link
                            key={option.id}
                            href={href}
                            className={`flex items-center justify-between gap-3 rounded-8 border p-3 ${
                              active
                                ? "border-action bg-action-tint"
                                : "border-line"
                            }`}
                          >
                            <span className="flex flex-col">
                              <span className="text-caption font-semibold">
                                {pickLocalized(option, "name", activeLocale)}
                              </span>
                              {option.etaMaxDays != null && (
                                <span className="text-caption text-ink-tertiary">
                                  {t("eta", {
                                    min: option.etaMinDays ?? 0,
                                    max: option.etaMaxDays,
                                  })}
                                </span>
                              )}
                            </span>
                            <span className="text-caption shrink-0">
                              {Number(option.price) === 0
                                ? t("free")
                                : formatPrice(option.price)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {preview ? (
          <OrderSummary
            preview={preview}
            action={
              <Link
                href={`/checkout/payment?addressId=${addressId}&shipments=${encodeURIComponent(
                  JSON.stringify(shipments),
                )}`}
                className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
              >
                {t("continueToPayment")}
              </Link>
            }
          />
        ) : (
          <aside className="bg-surface border-line h-fit rounded-16 border p-6 lg:w-[360px]">
            <p className="text-body text-ink-secondary">{t("addAddressFirst")}</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

function parseShipments(query: Record<string, string | string[] | undefined>) {
  const raw = firstParam(query.shipments);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function shippingHref(
  addressId: string | undefined,
  shipments: { sellerId: string; shippingOptionId: string }[],
): string {
  const params = new URLSearchParams();
  if (addressId) params.set("addressId", addressId);
  params.set("shipments", JSON.stringify(shipments.filter((s) => s.shippingOptionId)));
  return `/checkout/shipping?${params.toString()}`;
}

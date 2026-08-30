import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Check, HeartHandshake } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { orderSchema, SHIPMENT_STATUSES } from "@/lib/api/schemas/order";
import {
  orderItemTitle,
  orderReference,
  orderStatus,
} from "@/features/orders/helpers";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import type { Locale } from "@/i18n/routing";

/**
 * Order confirmation — Figma nodes 651:8043 / 651:8117.
 *
 * Reached via redirect after checkout, so a refresh can't resubmit the order.
 *
 * Follows `651:8043`: the detail table, the donation panel and the four-step
 * progress strip. Not rendered: the design's "Chat" button on the seller card,
 * which needs messaging (plans/09 C14).
 */
export const metadata: Metadata = { robots: { index: false } };

/** The design's progress strip. `cancelled` is a status, not a step. */
const PROGRESS = SHIPMENT_STATUSES.filter((s) => s !== "cancelled");

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout");
  const activeLocale = (await getLocale()) as Locale;

  // The order exists — a fetch failure here shouldn't hide the confirmation.
  const order = await serverApiFetch<unknown>(`/orders/${orderId}`)
    .then((data) => orderSchema.safeParse(data))
    .then((result) => (result.success ? result.data : null))
    .catch(() => null);

  const user = await getCurrentUser();
  const firstName = user?.fullName?.split(" ")[0];

  /**
   * Lines live on `shipments[].items`, not `order.items` — the latter is always
   * null. They carry `titleSnapshot` and `priceSnapshot` but no photo.
   */
  const shipment = order?.shipments?.[0];
  const lines = (order?.shipments ?? []).flatMap((s) => s.items ?? []);
  const currency = order?.currency ?? "SAR";
  const donation = Number(order?.donationAmount ?? 0);

  const shippingOption = shipment?.shippingOption;
  const shippingText = shippingOption
    ? [
        pickLocalized(shippingOption, "name", activeLocale),
        shippingOption.isTracked ? t("tracked") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const estDelivery =
    shipment?.estDeliveryFrom && shipment?.estDeliveryTo
      ? `${formatDate(shipment.estDeliveryFrom, activeLocale)} – ${formatDate(
          shipment.estDeliveryTo,
          activeLocale,
        )}`
      : null;

  const currentStatus = order ? orderStatus(order) : "placed";
  const currentStep = Math.max(0, PROGRESS.indexOf(currentStatus as never));

  return (
    <>
      <CheckoutSteps current="confirmed" />

      <div className="bg-surface min-h-full">
        <div className="mx-auto max-w-[680px] px-4 py-14">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="bg-action-tint flex size-16 items-center justify-center rounded-full">
              <Check className="text-action size-8" aria-hidden />
            </span>
            <h1 className="text-h1">{t("confirmedTitle")}</h1>
            <p className="text-body text-ink-secondary">
              {firstName
                ? t("confirmedGreeting", { name: firstName })
                : t("confirmedBody")}
            </p>
          </div>

          <dl className="bg-base mt-8 flex flex-col gap-3 rounded-16 p-6">
            <Row label={t("orderNumber")}>
              <span dir="ltr">
                {order ? orderReference(order) : `#${orderId.slice(0, 8).toUpperCase()}`}
              </span>
            </Row>

            {lines.length > 0 && (
              <Row label={t("item")}>
                <span dir="auto">
                  {orderItemTitle(lines[0])}
                  {lines.length > 1 &&
                    ` ${t("andMoreItems", { count: lines.length - 1 })}`}
                </span>
              </Row>
            )}

            {order?.totalAmount && (
              <Row label={t("totalPaid")}>
                {formatPrice(order.totalAmount, currency)}
              </Row>
            )}

            {shippingText && <Row label={t("shipping")}>{shippingText}</Row>}

            {estDelivery && (
              <Row label={t("estDelivery")}>
                <span dir="ltr">{estDelivery}</span>
              </Row>
            )}
          </dl>

          {donation > 0 && (
            <div className="bg-action-tint border-action mt-4 rounded-12 border p-4">
              <p className="text-action text-label flex items-center gap-2">
                <HeartHandshake className="size-4" aria-hidden />
                {t("donationThanksTitle")}
              </p>
              <p className="text-caption text-ink-secondary mt-1">
                {t("donationThanksBody", {
                  amount: formatPrice(order?.donationAmount, currency),
                })}
              </p>
            </div>
          )}

          <ol className="bg-base mt-4 flex items-start rounded-12 p-5">
            {PROGRESS.map((step, index) => {
              const reached = index <= currentStep;
              return (
                <li key={step} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <span
                      aria-hidden
                      className={`h-0.5 flex-1 ${
                        index === 0
                          ? "bg-transparent"
                          : index <= currentStep
                            ? "bg-action"
                            : "bg-line"
                      }`}
                    />
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        reached
                          ? "bg-aqua text-on-accent"
                          : "bg-tint text-ink-tertiary"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      aria-hidden
                      className={`h-0.5 flex-1 ${
                        index === PROGRESS.length - 1
                          ? "bg-transparent"
                          : index < currentStep
                            ? "bg-action"
                            : "bg-line"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-caption ${
                      reached ? "text-ink font-semibold" : "text-ink-tertiary"
                    }`}
                    aria-current={index === currentStep ? "step" : undefined}
                  >
                    {t(`orderSteps.${step}`)}
                  </span>
                </li>
              );
            })}
          </ol>

          {shipment?.seller && (
            <div className="bg-base mt-4 flex items-center gap-3 rounded-12 p-4">
              <span className="bg-action-tint text-action flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                {initials(shipment.seller.fullName ?? shipment.seller.username ?? "")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label truncate">
                  {shipment.seller.fullName ?? shipment.seller.username}
                </span>
                {shipment.seller.ratingCount ? (
                  <span className="text-caption text-ink-tertiary">
                    {t("sellerRating", {
                      rating: Number(shipment.seller.ratingAvg ?? 0).toFixed(1),
                      count: shipment.seller.ratingCount,
                    })}
                  </span>
                ) : null}
              </span>
            </div>
          )}

          {/*
            Escrow: the buyer pays, the Maison Hub authenticates, then funds are
            released to the seller. Saying so here sets the right expectation
            about when the item ships.
          */}
          <p className="text-caption text-ink-tertiary mt-4 text-center">
            {t("escrowNote")}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/account/orders/${orderId}`}
              className="bg-aqua text-on-accent text-label flex h-12 items-center justify-center rounded-[24px] font-semibold"
            >
              {t("trackOrder")}
            </Link>
            <Link
              href="/products"
              className="border-line bg-base text-label flex h-12 items-center justify-center rounded-[24px] border"
            >
              {t("continueShopping")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-body text-ink-secondary shrink-0">{label}</dt>
      <dd className="text-label min-w-0 truncate text-end">{children}</dd>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

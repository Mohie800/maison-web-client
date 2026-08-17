import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Check, MessageSquare, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOrder } from "@/lib/api/endpoints/orders";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import {
  orderItemImage,
  orderReference,
  orderStatus,
} from "@/features/orders/helpers";
import { TRACKING_STEPS, stepReached } from "@/lib/api/schemas/order";

/**
 * Order tracking — Figma node 651:8338 (Web_OrderTracking).
 *
 * The design's carrier panel (Aramex, tracking number, service, weight) and live
 * map have no backend source: `UpdateShipmentStatusDto` accepts only `status`,
 * and there is no per-event history with timestamps and locations. The timeline
 * below is built from shipment status, which is what the API actually knows.
 * Raised as GAP-27 — the carrier block appears automatically if those fields
 * arrive, since the schema already declares them optional.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const order = await getOrder(id);
  if (!order) notFound();

  const t = await getTranslations("Orders");
  const activeLocale = await getLocale();

  const status = orderStatus(order);
  const items =
    order.items ?? order.shipments?.flatMap((s) => s.items ?? []) ?? [];
  const shipment = order.shipments?.[0];
  const placed = order.placedAt ?? order.createdAt;

  const dateFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );

  /** Timestamps the API does expose per shipment, keyed to the step. */
  const stepTimestamps: Record<string, string | null | undefined> = {
    placed,
    packed: shipment?.packedAt,
    shipped: shipment?.shippedAt,
    delivered: shipment?.deliveredAt,
  };

  const hasCarrierInfo = Boolean(
    shipment?.trackingCarrier || shipment?.trackingNumber,
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <Breadcrumbs
        items={[
          { label: t("nav"), href: "/account/orders" },
          { label: orderReference(order) },
        ]}
      />

      <header className="bg-base border-line mt-6 flex flex-wrap items-center justify-between gap-4 rounded-16 border p-5">
        <div className="flex min-w-0 items-center gap-4">
          {items[0] && (
            <span className="bg-surface size-16 shrink-0 overflow-hidden rounded-8">
              {resolveMediaUrl(orderItemImage(items[0])) ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={resolveMediaUrl(orderItemImage(items[0]))!}
                  alt=""
                  className="size-full object-cover"
                />
              ) : null}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-h3 truncate" dir="auto">
              {items[0]?.title ?? items[0]?.listing?.title ?? orderReference(order)}
            </h1>
            <p className="text-caption text-ink-tertiary" dir="auto">
              {orderReference(order)}
              {placed && ` · ${t("placedOn", { date: dateFmt.format(new Date(placed)) })}`}
            </p>
          </div>
        </div>
        <OrderStatusBadge status={status} />
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <section className="min-w-0 flex-1">
          <ol className="bg-base border-line rounded-16 border p-6">
            {TRACKING_STEPS.map((step, index) => {
              const reached = stepReached(step.statuses, status);
              const timestamp = stepTimestamps[step.key];
              const isLast = index === TRACKING_STEPS.length - 1;

              return (
                <li key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                        reached ? "bg-action text-white" : "bg-tint text-ink-tertiary"
                      }`}
                    >
                      {reached ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : (
                        <span className="size-2 rounded-full bg-current" />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={`w-px flex-1 ${reached ? "bg-action" : "bg-line"}`}
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className={`flex flex-col gap-1 ${isLast ? "" : "pb-6"}`}>
                    <span
                      className={`text-label ${
                        reached ? "" : "text-ink-tertiary"
                      }`}
                    >
                      {t(`steps.${step.key}.title`)}
                    </span>
                    <span className="text-caption text-ink-secondary">
                      {t(`steps.${step.key}.body`)}
                    </span>
                    {reached && timestamp && (
                      <span className="text-caption text-ink-tertiary">
                        {dateFmt.format(new Date(timestamp))}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {status === "cancelled" && (
            <p className="text-caption text-error mt-4">{t("cancelledNote")}</p>
          )}
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[360px] lg:shrink-0">
          {/* Only rendered if the backend actually supplies carrier data. */}
          {hasCarrierInfo && (
            <div className="bg-base border-line rounded-16 border p-6">
              <h2 className="text-h3 mb-4">{t("carrierInfo")}</h2>
              <dl className="flex flex-col gap-3">
                {shipment?.trackingCarrier && (
                  <Row label={t("carrier")} value={shipment.trackingCarrier} />
                )}
                {shipment?.trackingNumber && (
                  <Row label={t("trackingNumber")} value={shipment.trackingNumber} />
                )}
              </dl>
            </div>
          )}

          <div className="bg-base border-line rounded-16 border p-6">
            <h2 className="text-h3 mb-4">{t("orderTotal")}</h2>
            <dl className="flex flex-col gap-3">
              <Row
                label={t("subtotal")}
                value={formatPrice(order.subtotalAmount, order.currency ?? "SAR")}
              />
              <Row
                label={t("shipping")}
                value={formatPrice(order.shippingAmount, order.currency ?? "SAR")}
              />
              <Row
                label={t("vat")}
                value={formatPrice(order.vatAmount, order.currency ?? "SAR")}
              />
              <div className="border-line flex items-baseline justify-between border-t pt-3">
                <dt className="text-label">{t("total")}</dt>
                <dd className="text-h3">
                  {formatPrice(order.totalAmount, order.currency ?? "SAR")}
                </dd>
              </div>
            </dl>
            <Link
              href={`/account/orders/${order.id}/invoice`}
              className="border-line text-label mt-5 flex h-10 items-center justify-center rounded-[20px] border"
            >
              {t("viewInvoice")}
            </Link>
          </div>

          {order.address && (
            <div className="bg-base border-line rounded-16 border p-6">
              <h2 className="text-h3 mb-3">{t("deliveryAddress")}</h2>
              <p className="text-caption text-ink-secondary" dir="auto">
                {[
                  order.address.recipientName,
                  order.address.street,
                  order.address.area,
                  order.address.city,
                  order.address.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {order.address.phone && (
                <p className="text-caption text-ink-tertiary mt-1" dir="ltr">
                  {order.address.phone}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/inbox"
              className="border-line text-label flex h-11 items-center justify-center gap-2 rounded-[22px] border"
            >
              <MessageSquare className="size-4" aria-hidden />
              {t("contactSeller")}
            </Link>

            {/*
              Returns are only possible on delivered items — the eligibility
              endpoint is buyer-and-delivered only.
            */}
            {status === "delivered" && (
              <Link
                href={`/account/orders/${order.id}/return`}
                className="text-caption text-error flex h-11 items-center justify-center gap-2"
              >
                <TriangleAlert className="size-4" aria-hidden />
                {t("reportIssue")}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd className="text-caption" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

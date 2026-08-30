import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOrder } from "@/lib/api/endpoints/orders";
import { resolveMediaUrl } from "@/lib/api/media";
import { trackingTimeline } from "@/lib/api/schemas/order";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { startConversationAction } from "@/features/inbox/actions";
import {
  orderItemImage,
  orderItemTitle,
  orderReference,
  orderStatus,
} from "@/features/orders/helpers";
import type { Locale } from "@/i18n/routing";

/**
 * Order tracking — Figma `651:8338` (Web_OrderTracking). This frame is the
 * order detail screen; totals and the delivery address live on Web_Invoice,
 * which the aside links to.
 *
 * The **live map is cut** — permanently, decided 2026-08-28. It needs a carrier
 * GPS feed and there is no carrier integration; see plans/09 C1 before putting
 * it back.
 *
 * Both of the frame's controls that once had nowhere to go now do: "Report an
 * Issue / Return" since the return flow shipped (plans/09 C15), and "Chat"
 * since Flow 7 did (C14).
 *
 * The design's "Out for Delivery" and "In Transit" steps come from a carrier
 * feed we don't have, so the timeline renders the events that exist rather than
 * padding it out. Same for per-step locations: seller-entered and often blank.
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
  const activeLocale = (await getLocale()) as Locale;

  const status = orderStatus(order);
  const shipment = order.shipments?.[0];
  const items =
    order.items ?? order.shipments?.flatMap((s) => s.items ?? []) ?? [];
  const placed = order.placedAt ?? order.createdAt;

  const first = items[0];
  const cover = resolveMediaUrl(orderItemImage(first));

  const timeline = trackingTimeline(shipment);

  const dateFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const stampFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  /** "15 May – 16 May 2026", or a single date when the range collapses. */
  const deliveryRange = (() => {
    const from = shipment?.estDeliveryFrom;
    const to = shipment?.estDeliveryTo;
    if (!from && !to) return null;
    if (from && to && from !== to) {
      return `${dateFmt.format(new Date(from))} – ${dateFmt.format(new Date(to))}`;
    }
    return dateFmt.format(new Date((from ?? to)!));
  })();

  const carrier = shipment?.trackingCarrier;
  const service =
    shipment?.shippingOption?.nameEn ?? shipment?.shippingOption?.code;
  // Rounded off the gram value, not via toFixed — 850g floats to "0.8", not "0.9".
  const weightKg =
    shipment?.parcelWeightGrams != null
      ? (Math.round(shipment.parcelWeightGrams / 100) / 10).toString()
      : null;

  const carrierRows = [
    carrier ? { label: t("carrier"), value: carrier } : null,
    shipment?.trackingNumber
      ? {
          label: t("trackingNumber"),
          value: shipment.trackingNumber,
          ltr: true,
        }
      : null,
    service ? { label: t("service"), value: service } : null,
    weightKg
      ? { label: t("weight"), value: t("weightKg", { kg: weightKg }) }
      : null,
  ].filter(
    (row): row is { label: string; value: string; ltr?: boolean } =>
      row !== null,
  );

  const seller = shipment?.seller;
  /* The listing a "Chat" thread is opened against — the order's first line. */
  const chatListingId = items.find((item) => item.listingId)?.listingId ?? null;
  const sellerHandle = seller?.username ?? seller?.fullName;
  const sellerAvatar = resolveMediaUrl(seller?.profilePic);
  const sellerInitials = (seller?.fullName ?? seller?.username ?? "")
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-surface min-h-full">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-16 lg:px-20">
        <Breadcrumbs
          items={[
            { label: t("nav"), href: "/account/orders" },
            { label: orderReference(order) },
          ]}
        />

        {/* OrderHdr — 651:8343 */}
        <header className="bg-base border-line flex items-center gap-4 rounded-16 border px-6 py-5">
          <span className="bg-fill-100 size-[60px] shrink-0 overflow-hidden rounded-10">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img src={cover} alt="" className="size-full object-cover" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="truncate text-[15px] font-semibold" dir="auto">
              {orderItemTitle(first) ?? orderReference(order)}
            </h1>
            <p className="text-ink-500 truncate text-[12px]" dir="auto">
              {orderReference(order)}
              {placed &&
                ` · ${t("placedOn", { date: dateFmt.format(new Date(placed)) })}`}
            </p>
          </div>
          <OrderStatusBadge status={status} size="pill" />
        </header>

        {/* Main — 651:8350 */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* ETA — 651:8352 */}
            {(deliveryRange || carrier) && (
              <section className="bg-action-tint border-action text-action flex items-center justify-between gap-4 rounded-[14px] border px-5 py-4">
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <p className="text-[12px]">{t("estimatedDelivery")}</p>
                  <p className="truncate text-[20px] font-bold" dir="auto">
                    {deliveryRange ?? t("awaitingDelivery")}
                  </p>
                </div>
                {(service || carrier) && (
                  <div className="flex shrink-0 flex-col items-end gap-[3px] text-end">
                    {service && <p className="text-[11px]">{service}</p>}
                    {carrier && (
                      <p className="text-[12px] font-semibold" dir="ltr">
                        {shipment?.trackingNumber
                          ? `${carrier} · ${shipment.trackingNumber}`
                          : carrier}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Timeline — 651:8359 */}
            <ol className="bg-base border-line rounded-16 border p-6">
              {timeline.map((step, index) => {
                const isLast = index === timeline.length - 1;
                const isCurrent = index === 0 && !step.pending;
                const label = t.has(`steps.${step.status}.title`)
                  ? t(`steps.${step.status}.title`)
                  : step.status;
                const body = step.pending
                  ? t("awaitingDelivery")
                  : (step.note ??
                    (t.has(`steps.${step.status}.body`)
                      ? t(`steps.${step.status}.body`)
                      : null));
                const meta = step.pending
                  ? deliveryRange && t("estimated", { date: deliveryRange })
                  : [
                      step.occurredAt &&
                        stampFmt.format(new Date(step.occurredAt)),
                      step.location,
                    ]
                      .filter(Boolean)
                      .join("  ·  ");

                return (
                  <li key={`${step.status}-${index}`} className="flex gap-4">
                    {/* DC — 651:8361 */}
                    <div className="flex w-5 flex-col items-center">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                          step.pending
                            ? "bg-line-200"
                            : isCurrent
                              ? "bg-aqua text-black"
                              : "bg-ink-900 text-base"
                        }`}
                      >
                        {!step.pending && (
                          <Check className="size-3" aria-hidden />
                        )}
                      </span>
                      {!isLast && (
                        <span
                          className="bg-ink-900 w-[2px] flex-1"
                          aria-hidden
                        />
                      )}
                    </div>

                    {/* SI — 651:8365 */}
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-[3px] ${isLast ? "" : "pb-6"}`}
                    >
                      <p
                        className={`text-[14px] ${
                          step.pending
                            ? "text-ink-400 font-semibold"
                            : isCurrent
                              ? "text-action font-bold"
                              : "font-semibold"
                        }`}
                      >
                        {label}
                      </p>
                      {body && (
                        <p
                          className={`text-[12px] ${step.pending ? "text-ink-400" : "text-ink-500"}`}
                          dir="auto"
                        >
                          {body}
                        </p>
                      )}
                      {meta && (
                        <p className="text-ink-400 text-[11px]" dir="auto">
                          {meta}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {status === "cancelled" && (
              <p className="text-caption text-error">{t("cancelledNote")}</p>
            )}

            {/* Both pages decide for themselves what is eligible and 404 when
                nothing is, so the links only show once delivered. The return
                link is what restores C15. */}
            {status === "delivered" && (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/account/orders/${order.id}/review`}
                  className="bg-aqua text-on-accent flex h-12 w-fit items-center rounded-[24px] px-6 text-[14px] font-semibold"
                >
                  {t("writeReview")}
                </Link>
                <Link
                  href={`/account/orders/${order.id}/return`}
                  className="border-ink flex h-12 w-fit items-center rounded-[24px] border px-6 text-[14px] font-semibold"
                >
                  {t("reportIssue")}
                </Link>
              </div>
            )}
          </div>

          <aside className="flex w-full flex-col gap-4 lg:w-[576px] lg:shrink-0">
            {/* Carrier — 651:8417. The Live Map above it in the frame is cut (plans/09 C1). */}
            {carrierRows.length > 0 && (
              <section className="bg-base border-line flex flex-col gap-3 rounded-[14px] border p-4">
                <h2 className="text-[14px] font-semibold">
                  {t("carrierInfo")}
                </h2>
                <dl className="flex flex-col gap-3">
                  {carrierRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <dt className="text-ink-500 text-[12px]">{row.label}</dt>
                      <dd
                        className="min-w-0 truncate text-[12px] font-semibold"
                        dir={row.ltr ? "ltr" : "auto"}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {shipment?.trackingUrl && (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-ink-900 text-base flex h-10 items-center justify-center rounded-[20px] text-[13px] font-medium"
                  >
                    {carrier ? t("trackOn", { carrier }) : t("trackParcel")}
                  </a>
                )}
              </section>
            )}

            {/* Seller — 651:8433 */}
            {seller && (
              <section className="bg-base border-line flex items-center gap-3 rounded-[14px] border px-4 py-3.5">
                <span className="bg-action-tint text-action flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-bold">
                  {sellerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={sellerAvatar}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    sellerInitials
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <Link
                    href={`/sellers/${seller.id}`}
                    className="truncate text-[13px] font-semibold"
                    dir={seller.username ? "ltr" : "auto"}
                  >
                    {seller.username ? `@${sellerHandle}` : sellerHandle}
                  </Link>
                  <p className="text-ink-500 text-[11px]">
                    {seller.ratingAvg != null
                      ? t("sellerWithRating", {
                          rating: Number(seller.ratingAvg).toFixed(1),
                        })
                      : t("sellerRole")}
                  </p>
                </div>

                {/*
                  Chat — 651:8439. Conversations open against a listing, never a
                  person, so the thread hangs off the first line in the order.
                */}
                {chatListingId && (
                  <form action={startConversationAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="listingId"
                      value={chatListingId}
                    />
                    <button
                      type="submit"
                      className="bg-ink-900 text-base flex h-[34px] shrink-0 items-center rounded-[17px] px-3.5 text-[12px] font-medium"
                    >
                      {t("chat")}
                    </button>
                  </form>
                )}
              </section>
            )}

            <Link
              href={`/account/orders/${order.id}/invoice`}
              className="border-line flex h-10 items-center justify-center rounded-[20px] border text-[13px] font-medium"
            >
              {t("viewInvoice")}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

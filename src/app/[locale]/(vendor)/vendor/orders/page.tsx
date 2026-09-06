import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getIncomingReturnShipmentIds,
  getSellerOrders,
} from "@/lib/api/endpoints/seller-orders";
import {
  isOverdue,
  nextTransition,
  type Shipment,
} from "@/lib/api/schemas/shipment";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { advanceShipmentAction } from "@/features/vendor/actions";
import { VendorTabs } from "@/features/vendor/components/vendor-tabs";

/**
 * Orders — `651:13851` light / `651:11221` dark. The seller's own parcels, from
 * `GET /orders/shipments`, which had no screen anywhere before the portal.
 *
 * **The buyer comes with the shipment now** (GAP-103, landed 2026-09-06), so the
 * `/sellers/{id}` lookup per row is gone.
 *
 * **"Returned" is still a join.** A shipment has no return state; the row is
 * marked from `/returns/incoming`, matched on `shipmentId`.
 *
 * **The deadline is real** (GAP-111): `shipBy` is 3 days from placement, so the
 * frame's "Action Needed" pill and its banner work as designed. `shipBy` is null
 * on every shipment created before the migration — it was not backfilled — and a
 * null is treated as "no deadline known", never as overdue.
 */
export const metadata: Metadata = { robots: { index: false } };

const TABS = ["all", "pending", "processing", "shipped", "delivered"] as const;
type Tab = (typeof TABS)[number];

const STATUS_TONE: Record<string, string> = {
  /* GAP-111 — a parcel past its `shipBy` that still needs the seller. */
  action_needed: "bg-vp-error text-error",
  placed: "bg-vp-warn text-amber-deep",
  pending: "bg-vp-warn text-amber-deep",
  paid: "bg-vp-warn text-amber-deep",
  processing: "bg-vp-warn text-amber-deep",
  packed: "bg-vp-warn text-amber-deep",
  shipped: "bg-vp-info text-info",
  out_for_delivery: "bg-vp-info text-info",
  delivered: "bg-vp-action text-action dark:text-aqua",
  cancelled: "bg-vp-error text-error",
  returned: "bg-vp-error text-error",
};

/** The parcel's headline item, plus how many more ride with it. */
function leadItem(shipment: Shipment) {
  const items = shipment.items ?? [];
  const first = items[0];
  return {
    title: first?.titleSnapshot ?? first?.listing?.title ?? null,
    cover: resolveMediaUrl(first?.coverPhotoUrl ?? first?.listing?.coverPhotoUrl),
    extra: Math.max(0, items.length - 1),
  };
}

export default async function VendorOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "all";
  const page = Math.max(1, Number(rawPage) || 1);

  const t = await getTranslations("Vendor.orders");

  const [orders, returned] = await Promise.all([
    getSellerOrders({ status: tab, page }).catch(() => null),
    getIncomingReturnShipmentIds(),
  ]);

  const rows = orders?.items ?? [];
  const counts = orders?.counts ?? {};

  const needsAction = rows.filter((r) => nextTransition(r) !== null).length;
  const overdueCount = rows.filter((row) => isOverdue(row)).length;

  return (
    <>
      {/* TB — 651:13905 */}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
          {t("title")}
        </h1>
        <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
          {t("subtitle")}
        </p>
      </div>

      {/* Alert — 651:13909. Only when there is something to act on. */}
      {needsAction > 0 && (
        <div className="bg-vp-warn border-gold rounded-10 flex items-center gap-3 border px-4 py-3">
          <span className="bg-warn-tint3 text-amber-deep flex size-7 shrink-0 items-center justify-center rounded-[14px] text-[12px] font-bold">
            !
          </span>
          <p className="text-amber-text text-[13px]">
            {overdueCount > 0
              ? t("alertOverdue", { count: overdueCount })
              : t("alert", { count: needsAction })}
          </p>
        </div>
      )}

      {/* Tabs3 — 651:13913. Tighter than the products strip: 6px gap, 14px sides. */}
      <VendorTabs
        active={tab}
        gap="tight"
        tabs={TABS.map((key) => ({
          key,
          label: t(`tabs.${key}`),
          count: counts[key] ?? 0,
          href: `/vendor/orders?tab=${key}`,
        }))}
      />

      {rows.length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-12 border px-4 py-8 text-center text-[13px]">
          {t("empty")}
        </p>
      ) : (
        rows.map((shipment) => {
          const { title, cover, extra } = leadItem(shipment);
          const next = nextTransition(shipment);
          const isReturned = returned.has(shipment.id);
          const overdue = isOverdue(shipment);
          const status = isReturned
            ? "returned"
            : overdue
              ? "action_needed"
              : String(shipment.status);
          const buyer = shipment.order?.buyer;
          const buyerLabel = buyer?.username
            ? `${buyer.fullName ?? ""} @${buyer.username}`.trim()
            : (buyer?.fullName ?? "");

          return (
            /* OR3 — 651:13934. The gold border is the frame's "needs you" state. */
            <div
              key={shipment.id}
              className={`bg-base dark:bg-tint rounded-12 flex items-center gap-4 px-4 py-3.5 ${
                next && !isReturned
                  ? "border-gold border-[1.5px]"
                  : "border-line-200 border"
              }`}
            >
              <span className="bg-fill-100 rounded-8 h-12 w-11 shrink-0 overflow-hidden">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={cover}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <p
                  className="text-ink-900 truncate text-[14px] font-semibold"
                  dir="auto"
                >
                  {title}
                  {extra > 0 && (
                    <span className="text-ink-500 dark:text-ink-450 font-normal">
                      {" "}
                      +{extra}
                    </span>
                  )}
                </p>
                <p
                  className="text-ink-500 dark:text-ink-450 truncate text-[11px]"
                  dir="auto"
                >
                  {t("orderLine", {
                    order: shipment.order?.orderNumber ?? "",
                    buyer: buyerLabel,
                  })}
                </p>
              </div>

              <p className="text-ink-900 shrink-0 text-[14px] font-bold">
                {formatPrice(
                  shipment.subtotalAmount,
                  shipment.order?.currency ?? "SAR",
                )}
              </p>

              <span
                className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[10px] font-bold ${
                  STATUS_TONE[status] ??
                  "bg-fill-100 text-ink-500 dark:text-ink-450"
                }`}
              >
                {t(`statuses.${status}`)}
              </span>

              {next && !isReturned ? (
                /* SB2 — 651:13942. Labelled by the step that is actually legal. */
                <form action={advanceShipmentAction} className="shrink-0">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={shipment.id} />
                  <input type="hidden" name="status" value={next} />
                  <button
                    type="submit"
                    className="bg-action text-base flex h-9 items-center rounded-[18px] px-4 text-[12px] font-bold"
                  >
                    {t(`advance.${next}`)}
                  </button>
                </form>
              ) : (
                /* VB — 651:13972 */
                <Link
                  href={`/vendor/orders/${shipment.id}`}
                  className="border-line-200 text-ink-900 flex h-9 shrink-0 items-center rounded-[18px] border px-4 text-[12px]"
                >
                  {t("viewDetail")}
                </Link>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

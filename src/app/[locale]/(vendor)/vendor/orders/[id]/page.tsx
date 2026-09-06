import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSellerOrder } from "@/lib/api/endpoints/seller-orders";
import { getListing } from "@/lib/api/endpoints/listings";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import {
  formatShippingAddress,
  nextTransition,
} from "@/lib/api/schemas/shipment";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { advanceShipmentAction } from "@/features/vendor/actions";

/**
 * Order detail — `651:13994` light / `651:11356` dark.
 *
 * Round 9 (2026-09-06) finished this screen. The shipment now carries
 * `order.shippingAddressSnapshot` (GAP-103) and a server-computed `earnings`
 * split (GAP-112), so the delivery address is real and the Payment card no
 * longer scans the wallet ledger for a matching `orderShipmentId`.
 *
 * The address is a **snapshot** taken at checkout, which is the right thing to
 * print on a parcel: it does not move if the buyer later edits their address.
 *
 * The frame prints "Platform Fee (1%)". The real rate is **15%**, from
 * `GET /settings/fees`, so the label is built from the API. VAT is a separate
 * 15% collected from the buyer and remitted by the platform — it is the buyer's
 * line, not the seller's, so it is not deducted from earnings here.
 *
 * Still omitted: the frame's "15 previous orders" (no per-buyer order count) and
 * "Print Shipping Label" (no endpoint). See plans/09 C73.
 */
export const metadata: Metadata = { robots: { index: false } };

const STEPS = ["paid", "packed", "shipped", "delivered"] as const;

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Vendor.orderDetail");
  const tOrders = await getTranslations("Vendor.orders");
  const shipment = await getSellerOrder(id);
  if (!shipment) notFound();

  const items = shipment.items ?? [];
  const currency = shipment.order?.currency ?? "SAR";

  const [fees, listings] = await Promise.all([
    getPlatformFees().catch(() => null),
    Promise.all(
      items.map((item) =>
        item.listingId ? getListing(item.listingId).catch(() => null) : null,
      ),
    ),
  ]);

  const buyer = shipment.order?.buyer;
  const address = shipment.order?.shippingAddressSnapshot;
  const breakdown = shipment.earnings ?? null;

  const next = nextTransition(shipment);
  /* Which steps are behind us. `paid` is implied by the shipment existing. */
  const reached = {
    paid: true,
    packed: Boolean(shipment.packedAt),
    shipped: Boolean(shipment.shippedAt),
    delivered: Boolean(shipment.deliveredAt),
  };
  const currentIndex = STEPS.findIndex((s) => !reached[s]);

  const buyerInitials = (buyer?.fullName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* BC4 — 651:14048 */}
      <nav className="flex gap-1.5 pb-2 text-[12px]">
        <Link href="/vendor/orders" className="text-action">
          {t("breadcrumb")}
        </Link>
        <span className="text-ink-500 dark:text-ink-450 rtl:rotate-180">&gt;</span>
        <span className="text-ink-500 dark:text-ink-450">
          {t("order", { number: shipment.order?.orderNumber ?? "" })}
        </span>
      </nav>

      {/* Steps4 — 651:14052 */}
      <ol className="bg-base dark:bg-tint border-line-200 rounded-12 flex h-16 items-center justify-center gap-0 overflow-x-auto border px-8">
        {STEPS.map((step, index) => {
          const done = reached[step];
          const isCurrent = index === currentIndex;
          return (
            <li key={step} className="flex shrink-0 items-center">
              {index > 0 && (
                <span
                  className={`me-2 h-[2px] w-[60px] ${
                    reached[STEPS[index - 1]] ? "bg-ink-900" : "bg-line-200"
                  }`}
                  aria-hidden
                />
              )}
              <span className="flex items-center gap-2 pe-2">
                <span
                  className={`flex size-[22px] items-center justify-center rounded-[11px] text-[9px] font-bold ${
                    done
                      ? "bg-ink-900 text-base"
                      : isCurrent
                        ? "bg-aqua text-black"
                        : "bg-fill-100 text-ink-500 dark:text-ink-450"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span
                  className={`text-[12px] whitespace-nowrap ${
                    isCurrent
                      ? "text-action dark:text-aqua font-semibold"
                      : done
                        ? "text-ink-900"
                        : "text-ink-500 dark:text-ink-450"
                  }`}
                >
                  {t(`steps.${step}`)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* M4 — 651:14072 */}
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="flex flex-col gap-4 xl:w-[670px]">
          {/* Cust — 651:14074 */}
          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4">
            <h2 className="text-ink-900 text-[13px] font-semibold">
              {t("customer")}
            </h2>
            <div className="flex items-center gap-3">
              <span className="bg-vp-info text-info flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-[11px] font-bold">
                {resolveMediaUrl(buyer?.profilePic) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={resolveMediaUrl(buyer?.profilePic) ?? ""}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  buyerInitials
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <p
                  className="text-ink-900 truncate text-[13px] font-semibold"
                  dir="auto"
                >
                  {buyer?.fullName}
                </p>
                {buyer?.username && (
                  <p
                    className="text-ink-500 dark:text-ink-450 truncate text-[11px]"
                    dir="ltr"
                  >
                    @{buyer.username}
                  </p>
                )}
              </div>
              <Link
                href="/inbox"
                className="border-line-200 text-ink-900 rounded-8 flex h-8 shrink-0 items-center border px-3 text-[11px]"
              >
                {t("message")}
              </Link>
            </div>

            <h3 className="text-ink-500 dark:text-ink-450 text-[12px] font-semibold">
              {t("shippingAddress")}
            </h3>
            {address ? (
              <div className="text-ink-900 flex flex-col text-[12px]" dir="auto">
                {formatShippingAddress(address).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-ink-500 dark:text-ink-450 text-[12px]">
                {t("addressMissing")}
              </p>
            )}
          </section>

          {/* ICard — 651:14086 */}
          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4">
            <h2 className="text-ink-900 text-[13px] font-semibold">
              {t("items")}
            </h2>
            {items.map((item, index) => {
              const listing = listings[index];
              const cover = resolveMediaUrl(
                item.coverPhotoUrl ?? item.listing?.coverPhotoUrl,
              );
              /* "Like New · Size M" — condition and size live on the listing. */
              const meta = [
                listing?.condition
                  ? String(listing.condition).replace(/_/g, " ")
                  : null,
                (listing?.attributes as { size?: string } | null)?.size,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="bg-fill-100 rounded-8 size-13 shrink-0 overflow-hidden">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={cover}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p
                      className="text-ink-900 truncate text-[13px] font-semibold"
                      dir="auto"
                    >
                      {item.titleSnapshot ?? item.listing?.title}
                    </p>
                    {meta && (
                      <p className="text-ink-500 dark:text-ink-450 truncate text-[11px] capitalize">
                        {meta}
                      </p>
                    )}
                  </div>
                  <p className="text-ink-900 shrink-0 text-[13px] font-bold">
                    {formatPrice(item.priceSnapshot, currency)}
                  </p>
                </div>
              );
            })}
          </section>
        </div>

        <div className="flex flex-col gap-4 xl:w-[426px]">
          {/* PayCard — 651:14095 */}
          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-2.5 border p-4">
            <h2 className="text-ink-900 text-[13px] font-semibold">
              {t("payment")}
            </h2>
            <Row
              label={t("subtotal")}
              value={formatPrice(
                breakdown?.grossAmount ?? shipment.subtotalAmount,
                currency,
              )}
            />
            <Row
              label={t("shipping")}
              value={formatPrice(
                breakdown?.shippingAmount ?? shipment.shippingAmount,
                currency,
              )}
            />
            {breakdown?.platformFeeAmount != null && (
              <Row
                label={t("platformFee", {
                  percent: fees?.platformFeePercent ?? 0,
                })}
                value={formatPrice(breakdown.platformFeeAmount, currency)}
              />
            )}
            {/*
              VAT (GAP-115) is collected from the buyer and remitted by the
              platform, so it is shown for the record and never subtracted from
              the seller's earnings.
            */}
            {shipment.order?.vatAmount != null && (
              <Row
                label={t("vat", { percent: fees?.vat?.ratePercent ?? 15 })}
                value={formatPrice(shipment.order.vatAmount, currency)}
              />
            )}

            <span className="bg-line-200 h-px w-full" aria-hidden />

            {/* ER — 651:14110 */}
            {breakdown?.netAmount != null ? (
              <div className="text-action dark:text-aqua flex items-center justify-between">
                <span className="text-[13px] font-semibold">
                  {t("earnings")}
                </span>
                <span className="text-[16px] font-bold">
                  {formatPrice(breakdown.netAmount, currency)}
                </span>
              </div>
            ) : (
              <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                {t("earningsPending")}
              </p>
            )}
          </section>

          {/* ActCard — 651:14113 */}
          {(next || shipment.trackingCarrier) && (
            <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col items-start gap-3 border p-4">
              <h2 className="text-ink-900 text-[13px] font-semibold">
                {t("actions")}
              </h2>
              {next && (
                <form action={advanceShipmentAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={shipment.id} />
                  <input type="hidden" name="status" value={next} />
                  <button
                    type="submit"
                    className="bg-action text-base flex h-[35px] items-center justify-center rounded-[24px] px-5 text-[14px] font-bold"
                  >
                    {tOrders(`advance.${next}`)}
                  </button>
                </form>
              )}
              {shipment.trackingCarrier && (
                <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                  {t("shippingVia", { carrier: shipment.trackingCarrier })}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-[12px]">
      <span className="text-ink-500 dark:text-ink-450">{label}</span>
      <span className="text-ink-900">{value}</span>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/format/money";
import type { CheckoutPreview } from "@/lib/api/schemas/checkout";

/**
 * Order totals rail — Figma `651:7551`, `651:7740`, `651:7932`.
 *
 * Every figure is rendered straight from `POST /orders/checkout/preview`.
 * Nothing here is computed: VAT is 15% of (subtotal + shipping) server-side, and
 * recomputing it in the browser is how a checkout ends up displaying a different
 * number than it charges.
 *
 * The design's Trade Fees / Insurance Fee / Auction Fee rows are not rendered —
 * the preview carries no such fields. See plans/09 C23.
 */
export async function OrderSummary({
  preview,
  itemCount,
  shippingLabel,
  couponCode,
  charityName,
}: {
  preview: CheckoutPreview;
  itemCount?: number;
  /** The chosen method's name, when one method covers the whole order. */
  shippingLabel?: string | null;
  couponCode?: string | null;
  charityName?: string | null;
}) {
  const t = await getTranslations("Checkout");
  const currency = preview.currency ?? "SAR";
  const discount = Number(preview.discountAmount ?? 0);
  const donation = Number(preview.donationAmount ?? 0);

  return (
    <aside className="bg-base h-fit rounded-16 p-5 lg:w-[360px] lg:shrink-0">
      <h2 className="text-body-lg font-bold">{t("summary")}</h2>
      <hr className="border-line my-4 border-0 border-t" />

      <dl className="flex flex-col gap-3">
        <Row
          label={
            itemCount === undefined
              ? t("subtotal")
              : t("subtotalWithCount", { count: itemCount })
          }
          value={formatPrice(preview.subtotalAmount, currency)}
        />
        <Row
          label={shippingLabel || t("shipping")}
          value={formatPrice(preview.shippingAmount, currency)}
        />
        <Row label={t("vat")} value={formatPrice(preview.vatAmount, currency)} />

        {discount > 0 && (
          <Row
            label={
              couponCode
                ? t("discountWithCode", { code: couponCode })
                : t("discount")
            }
            value={`−${formatPrice(preview.discountAmount, currency)}`}
            tone="text-error"
          />
        )}

        {donation > 0 && (
          <Row
            label={
              charityName ? t("donationTo", { charity: charityName }) : t("donation")
            }
            value={`+${formatPrice(preview.donationAmount, currency)}`}
            tone="text-action"
          />
        )}
      </dl>

      <hr className="border-line my-4 border-0 border-t" />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-label">{t("total")}</span>
        <span className="text-h3">
          {formatPrice(preview.totalAmount, currency)}
        </span>
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={`text-body ${tone ?? "text-ink-secondary"}`}>{label}</dt>
      <dd className={`text-body ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

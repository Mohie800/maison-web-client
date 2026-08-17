import { getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/format/money";
import type { CheckoutPreview } from "@/lib/api/schemas/checkout";

/**
 * Order totals panel.
 *
 * Every figure is rendered straight from `POST /orders/checkout/preview`.
 * Nothing here is computed: VAT is 15% of (subtotal + shipping) server-side, and
 * recomputing it in the browser is how a checkout ends up displaying a different
 * number than it charges.
 */
export async function OrderSummary({
  preview,
  action,
}: {
  preview: CheckoutPreview;
  action?: React.ReactNode;
}) {
  const t = await getTranslations("Checkout");
  const currency = preview.currency ?? "SAR";

  return (
    <aside className="bg-surface border-line h-fit rounded-16 border p-6 lg:w-[360px] lg:shrink-0">
      <h2 className="text-h3 mb-4">{t("summary")}</h2>

      <dl className="flex flex-col gap-3">
        <Row label={t("subtotal")} value={formatPrice(preview.subtotalAmount, currency)} />
        <Row label={t("shipping")} value={formatPrice(preview.shippingAmount, currency)} />

        {preview.discountAmount && Number(preview.discountAmount) > 0 && (
          <Row
            label={t("discount")}
            value={`− ${formatPrice(preview.discountAmount, currency)}`}
            tone="text-action"
          />
        )}

        {/* VAT is 15%, applied to subtotal + shipping. Server-computed. */}
        <Row label={t("vat")} value={formatPrice(preview.vatAmount, currency)} />

        {preview.donationAmount && Number(preview.donationAmount) > 0 && (
          <Row
            label={t("donation")}
            value={formatPrice(preview.donationAmount, currency)}
          />
        )}

        <div className="border-line mt-1 flex items-baseline justify-between border-t pt-3">
          <dt className="text-label">{t("total")}</dt>
          <dd className="text-h2">
            {formatPrice(preview.totalAmount, currency)}
          </dd>
        </div>
      </dl>

      {action && <div className="mt-5">{action}</div>}
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
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd className={`text-caption ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

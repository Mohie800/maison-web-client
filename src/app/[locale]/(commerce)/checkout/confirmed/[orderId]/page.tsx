import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { orderSchema } from "@/lib/api/schemas/checkout";
import { formatPrice } from "@/lib/format/money";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";

/**
 * Order confirmation — Figma nodes 651:8043 / 651:8117.
 *
 * Reached via redirect after checkout, so a refresh can't resubmit the order.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Checkout");

  // The order exists — a fetch failure here shouldn't hide the confirmation.
  const order = await serverApiFetch<unknown>(`/orders/${orderId}`)
    .then((data) => orderSchema.safeParse(data))
    .then((result) => (result.success ? result.data : null))
    .catch(() => null);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <CheckoutSteps current="confirmed" />

      <div className="border-line mx-auto mt-10 flex max-w-[560px] flex-col items-center gap-4 rounded-16 border p-14 text-center">
        <CheckCircle2 className="text-action size-12" aria-hidden />
        <h1 className="text-h1">{t("confirmedTitle")}</h1>
        <p className="text-body text-ink-secondary">{t("confirmedBody")}</p>

        <dl className="bg-surface mt-2 flex w-full flex-col gap-2 rounded-12 p-4">
          <div className="flex justify-between gap-4">
            <dt className="text-caption text-ink-secondary">{t("orderNumber")}</dt>
            <dd className="text-caption" dir="ltr">
              {orderId.slice(0, 8).toUpperCase()}
            </dd>
          </div>
          {order?.totalAmount && (
            <div className="flex justify-between gap-4">
              <dt className="text-caption text-ink-secondary">{t("total")}</dt>
              <dd className="text-label">
                {formatPrice(order.totalAmount, order.currency ?? "SAR")}
              </dd>
            </div>
          )}
          {order?.status && (
            <div className="flex justify-between gap-4">
              <dt className="text-caption text-ink-secondary">{t("status")}</dt>
              <dd className="text-caption">{order.status}</dd>
            </div>
          )}
        </dl>

        {/*
          Escrow: the buyer pays, the Maison Hub authenticates, then funds are
          released to the seller. Saying so here sets the right expectation about
          when the item ships.
        */}
        <p className="text-caption text-ink-tertiary">{t("escrowNote")}</p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href={`/account/orders/${orderId}`}
            className="bg-aqua text-on-accent text-label flex h-12 items-center rounded-[24px] px-6 font-semibold"
          >
            {t("trackOrder")}
          </Link>
          <Link
            href="/products"
            className="border-ink text-label flex h-12 items-center rounded-[24px] border px-6 font-semibold"
          >
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { getInvoice, getOrder } from "@/lib/api/endpoints/orders";
import { formatPrice } from "@/lib/format/money";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { orderReference } from "@/features/orders/helpers";

/**
 * Tax invoice — Figma node 651:8443 (Web_Invoice).
 *
 * Saudi VAT invoices are a legal document, so every figure comes from
 * `GET /orders/{id}/invoice` and nothing is recomputed here. If the projection
 * is unavailable we say so rather than assembling an invoice-looking page from
 * order fields — a wrong tax document is worse than none.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [order, invoice] = await Promise.all([getOrder(id), getInvoice(id)]);
  if (!order) notFound();

  const t = await getTranslations("Orders");
  const activeLocale = await getLocale();
  const currency = invoice?.currency ?? order.currency ?? "SAR";

  const issued = invoice?.issuedAt ?? order.placedAt ?? order.createdAt;
  const dateFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const lines = invoice?.items ?? order.items ?? [];

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 lg:px-20">
      <Breadcrumbs
        items={[
          { label: t("nav"), href: "/account/orders" },
          { label: orderReference(order), href: `/account/orders/${order.id}` },
          { label: t("invoice") },
        ]}
      />

      {!invoice ? (
        <div className="bg-base border-line mt-6 rounded-16 border border-dashed p-14 text-center">
          <h1 className="text-h3 mb-2">{t("invoiceUnavailableTitle")}</h1>
          <p className="text-body text-ink-secondary">
            {t("invoiceUnavailableBody")}
          </p>
        </div>
      ) : (
        <article className="bg-base border-line mt-6 rounded-16 border p-8">
          <header className="border-line flex flex-wrap items-start justify-between gap-4 border-b pb-6">
            <div>
              <h1 className="text-h2">{t("invoice")}</h1>
              <p className="text-caption text-ink-tertiary mt-1" dir="ltr">
                {invoice.invoiceNumber ?? orderReference(order)}
              </p>
            </div>
            <div className="text-end">
              <span className="text-h3 font-bold">
                Maison<span className="text-action"> Sale</span>
              </span>
              {issued && (
                <p className="text-caption text-ink-tertiary mt-1">
                  {dateFmt.format(new Date(issued))}
                </p>
              )}
            </div>
          </header>

          {order.address && (
            <section className="border-line border-b py-6">
              <h2 className="text-label mb-2">{t("billedTo")}</h2>
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
            </section>
          )}

          {lines.length > 0 && (
            <section className="py-6">
              <table className="w-full">
                <thead>
                  <tr className="border-line border-b">
                    <th className="text-caption text-ink-tertiary pb-3 text-start font-normal">
                      {t("item")}
                    </th>
                    <th className="text-caption text-ink-tertiary pb-3 text-end font-normal">
                      {t("amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id ?? index} className="border-line border-b">
                      <td className="text-caption py-3" dir="auto">
                        {line.title ?? line.listing?.title ?? ""}
                      </td>
                      <td className="text-caption py-3 text-end">
                        {formatPrice(line.price, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="border-line border-t pt-6">
            <dl className="ms-auto flex max-w-[320px] flex-col gap-3">
              <Row
                label={t("subtotal")}
                value={formatPrice(invoice.subtotalAmount, currency)}
              />
              <Row
                label={t("shipping")}
                value={formatPrice(invoice.shippingAmount, currency)}
              />
              {invoice.discountAmount &&
                Number(invoice.discountAmount) > 0 && (
                  <Row
                    label={t("discount")}
                    value={`− ${formatPrice(invoice.discountAmount, currency)}`}
                  />
                )}
              <Row
                label={t("vat")}
                value={formatPrice(invoice.vatAmount, currency)}
              />
              <div className="border-line flex items-baseline justify-between border-t pt-3">
                <dt className="text-label">{t("total")}</dt>
                <dd className="text-h3">
                  {formatPrice(invoice.totalAmount, currency)}
                </dd>
              </div>
            </dl>
          </section>

          {/*
            Printing is the browser's job — no download link, since the sandbox
            can't hand a file over and a fake one would be worse.
          */}
          <p className="text-caption text-ink-tertiary mt-8">
            {t("invoicePrintHint")}
          </p>
        </article>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd className="text-caption">{value}</dd>
    </div>
  );
}

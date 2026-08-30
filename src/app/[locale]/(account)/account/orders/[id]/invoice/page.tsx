import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { getInvoice, getOrder } from "@/lib/api/endpoints/orders";
import { formatPrice } from "@/lib/format/money";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PrintButton } from "@/features/orders/components/print-button";
import { orderReference } from "@/features/orders/helpers";
import type { Locale } from "@/i18n/routing";

/**
 * Tax invoice — Figma node 651:8443 (Web_Invoice).
 *
 * Saudi VAT invoices are a legal document, so every figure comes from
 * `GET /orders/{id}/invoice` and nothing is recomputed here. If the projection
 * is unavailable we say so rather than assembling an invoice-looking page from
 * order fields — a wrong tax document is worse than none.
 *
 * That rule is also why the design's unit-price column isn't rendered: a line
 * carries `lineTotal` and `quantity`, not a unit price, and dividing one by the
 * other is arithmetic on a tax document. See plans/09 C30.
 *
 * The design's "Platform fee (1%)" row is not rendered either — the fee is 15%
 * and the seller pays it, so it is not part of what the buyer was charged
 * (plans/09 C23, and C18 for the rate).
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
  const activeLocale = (await getLocale()) as Locale;
  const currency = invoice?.currency ?? order.currency ?? "SAR";

  const dateFmt = new Intl.DateTimeFormat(
    activeLocale === "ar" ? "ar-SA-u-nu-latn" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );

  const totals = invoice?.totals;
  const issuer = invoice?.issuer;
  const lines = invoice?.items ?? [];
  const sellers = [
    ...new Set(
      (invoice?.shipments ?? [])
        .map((s) => s.sellerUsername)
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  /** 0.15 → "15%". Formatting, not arithmetic on money. */
  const vatRate =
    totals?.vatRate != null
      ? `${Math.round(Number(totals.vatRate) * 100)}%`
      : null;

  const paid = invoice?.paymentStatus === "paid";
  const card = invoice?.payment;
  const cardLabel = card?.cardBrand
    ? `${card.cardBrand.charAt(0).toUpperCase()}${card.cardBrand.slice(1)}${
        card.cardLast4 ? ` •••• ${card.cardLast4}` : ""
      }`
    : (card?.methodType ?? null);

  return (
    <div className="bg-surface min-h-full">
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <div className="print:hidden">
          <Breadcrumbs
            items={[
              { label: t("nav"), href: "/account/orders" },
              {
                label: orderReference(order),
                href: `/account/orders/${order.id}`,
              },
              { label: t("invoice") },
            ]}
          />
        </div>

        <div className="mt-6 mb-4 flex items-center justify-between gap-4">
          <h1 className="text-h1">{t("invoice")}</h1>
          {invoice && <PrintButton />}
        </div>

        {!invoice ? (
          <div className="bg-base border-line rounded-16 border border-dashed p-14 text-center">
            <h2 className="text-h3 mb-2">{t("invoiceUnavailableTitle")}</h2>
            <p className="text-body text-ink-secondary">
              {t("invoiceUnavailableBody")}
            </p>
          </div>
        ) : (
          <article className="bg-base rounded-16 p-8">
            {/* Issuer — 651:8452 */}
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-h3">{issuer?.name ?? "Maison Sale"}</p>
                <p className="text-caption text-ink-tertiary mt-1">
                  {t("taxInvoice")} / فاتورة ضريبية
                </p>
                {/*
                  The VAT and CR numbers belong to the issuer, not the seller —
                  the design labels them under SELLER, which is where a
                  marketplace invoice would be wrong. Rendered where they apply.
                */}
                {(issuer?.vatRegistration || issuer?.crNumber) && (
                  <p className="text-caption text-ink-tertiary mt-1" dir="ltr">
                    {[
                      issuer?.vatRegistration &&
                        t("vatNo", { number: issuer.vatRegistration }),
                      issuer?.crNumber,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                )}
              </div>
              <div className="text-end">
                <p className="text-label" dir="ltr">
                  {invoice.invoiceNumber ?? orderReference(order)}
                </p>
                {invoice.issueDate && (
                  <p className="text-caption text-ink-tertiary mt-1">
                    {t("issuedOn", {
                      date: dateFmt.format(new Date(invoice.issueDate)),
                    })}
                  </p>
                )}
              </div>
            </header>

            <hr className="border-line my-6 border-0 border-t" />

            {/* Parties — 651:8462 */}
            <div className="grid gap-6 sm:grid-cols-2">
              <section>
                <h2 className="text-ink-tertiary mb-2 text-[11px] font-bold tracking-[0.08em] uppercase">
                  {t("billedTo")}
                </h2>
                <p className="text-label" dir="auto">
                  {invoice.billedTo?.recipientName}
                </p>
                {(invoice.billedTo?.addressLines ?? []).map((line) => (
                  <p key={line} className="text-caption text-ink-secondary" dir="auto">
                    {line}
                  </p>
                ))}
                {invoice.billedTo?.phone && (
                  <p className="text-caption text-ink-secondary" dir="ltr">
                    {invoice.billedTo.phone}
                  </p>
                )}
              </section>

              {sellers.length > 0 && (
                <section>
                  <h2 className="text-ink-tertiary mb-2 text-[11px] font-bold tracking-[0.08em] uppercase">
                    {t("seller")}
                  </h2>
                  {sellers.map((name) => (
                    <p key={name} className="text-label" dir="ltr">
                      @{name}
                    </p>
                  ))}
                  {invoice.shippedTo?.sameAsBilling && (
                    <p className="text-caption text-ink-tertiary mt-2">
                      {t("shippedToSameAsBilling")}
                    </p>
                  )}
                </section>
              )}
            </div>

            <hr className="border-line my-6 border-0 border-t" />

            {/* Lines — 651:8477 */}
            {lines.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-line border-b">
                    <th className="text-ink-tertiary pb-3 text-start text-[11px] font-bold tracking-[0.08em] uppercase">
                      {t("item")}
                    </th>
                    <th className="text-ink-tertiary w-16 pb-3 text-end text-[11px] font-bold tracking-[0.08em] uppercase">
                      {t("qty")}
                    </th>
                    <th className="text-ink-tertiary w-32 pb-3 text-end text-[11px] font-bold tracking-[0.08em] uppercase">
                      {t("lineTotal")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={`${line.title}-${index}`} className="border-line border-b">
                      <td className="text-body py-3" dir="auto">
                        {line.title}
                        {line.sellerUsername && (
                          <span className="text-caption text-ink-tertiary block" dir="ltr">
                            @{line.sellerUsername}
                          </span>
                        )}
                      </td>
                      <td className="text-body py-3 text-end">
                        {line.quantity ?? 1}
                      </td>
                      <td className="text-label py-3 text-end">
                        {formatPrice(line.lineTotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals — 651:8489 */}
            <dl className="mt-6 flex flex-col gap-3">
              <Row
                label={t("subtotal")}
                value={formatPrice(totals?.subtotal, currency)}
              />
              {Number(totals?.discount ?? 0) > 0 && (
                <Row
                  label={
                    totals?.couponCode
                      ? t("discountWithCode", { code: totals.couponCode })
                      : t("discount")
                  }
                  value={`− ${formatPrice(totals?.discount, currency)}`}
                  tone="text-action"
                />
              )}
              <Row
                label={t("shipping")}
                value={formatPrice(totals?.shipping, currency)}
              />
              <Row
                label={vatRate ? t("vatAt", { rate: vatRate }) : t("vat")}
                value={formatPrice(totals?.vat, currency)}
              />
              {Number(totals?.donation ?? 0) > 0 && (
                <Row
                  label={
                    totals?.donationCharity
                      ? t("donationTo", { charity: totals.donationCharity })
                      : t("donation")
                  }
                  value={formatPrice(totals?.donation, currency)}
                />
              )}
            </dl>

            <hr className="border-line my-4 border-0 border-t" />

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-h3">{t("totalPaid")}</span>
              <span className="text-h2">
                {formatPrice(totals?.total, currency)}
              </span>
            </div>

            {/* Payment — 651:8506 */}
            {(cardLabel || paid) && (
              <div className="bg-surface mt-6 flex flex-wrap items-center justify-between gap-3 rounded-12 p-4">
                <div>
                  {cardLabel && (
                    <p className="text-label" dir="ltr">
                      {t("paidWith", { method: cardLabel })}
                    </p>
                  )}
                  <p className="text-caption text-ink-tertiary mt-0.5" dir="auto">
                    {[
                      invoice.orderNumber
                        ? `#${invoice.orderNumber}`
                        : orderReference(order),
                      invoice.issueDate &&
                        dateFmt.format(new Date(invoice.issueDate)),
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                </div>
                {paid && (
                  <span className="bg-action-tint text-action rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase">
                    {t("statuses.paid")}
                  </span>
                )}
              </div>
            )}

            <p className="text-caption text-ink-tertiary mt-6">
              {t("invoiceFootnote")}
            </p>
          </article>
        )}
      </div>
    </div>
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
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-body text-ink-secondary">{label}</dt>
      <dd className={`text-body ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

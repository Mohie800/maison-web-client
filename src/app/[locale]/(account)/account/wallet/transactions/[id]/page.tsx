import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Receipt } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getWallet, getWalletTransaction } from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";
import { isCredit } from "@/lib/api/schemas/wallet";
import { resolveMediaUrl } from "@/lib/api/media";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import type { Locale } from "@/i18n/routing";

/**
 * Transaction detail — Figma `651:10726`.
 *
 * All ten of the design's rows (GAP-38, and GAP-45 for the last of them):
 * reference, type, date, item, counterparty, item price, platform fee,
 * shipping, net earnings, and the receipt — which needs no new endpoint, since
 * `order.id` points at the invoice projection that has existed since checkout.
 *
 * The shipping row now reconciles, and says which of two things happened. On
 * `included_in_price` the seller absorbed the parcel and it is a real
 * deduction. Otherwise nothing came out of the payout, and the row states that
 * rather than printing a bare 0 — the buyer paid it, which the seller can't
 * tell from the number alone.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const transaction = await getWalletTransaction(id);
  if (!transaction) notFound();

  const t = await getTranslations("Wallet");
  const activeLocale = (await getLocale()) as Locale;
  const wallet = await getWallet();

  const credit = isCredit(transaction);
  const currency = transaction.currency ?? wallet.currency ?? "SAR";
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  const reasonKey = transaction.reason ?? "";
  const breakdown = transaction.breakdown;

  const listing = transaction.listing;
  const thumbnail = resolveMediaUrl(listing?.coverPhotoUrl);
  const listingHref = listing?.id ?? transaction.listingId;

  /** Who the other party is depends on which side of the row we're on. */
  const counterpartyLabel =
    reasonKey === "transfer_sent"
      ? t("detail.counterpartySent")
      : reasonKey === "transfer_received"
        ? t("detail.counterpartyReceived")
        : t("detail.counterparty");

  const money = (value: number | null | undefined) =>
    value == null ? null : formatPrice(value, currency);

  const rows = [
    { label: t("detail.reference"), value: transaction.id, ltr: true },
    {
      label: t("detail.type"),
      value: t.has(`reasons.${reasonKey}`)
        ? t(`reasons.${reasonKey}`)
        : (transaction.label ??
          t(`filters.${credit ? "credit" : "debit"}`)),
    },
    ...(transaction.createdAt
      ? [
          {
            label: t("detail.date"),
            value: formatDateTime(transaction.createdAt, activeLocale),
          },
        ]
      : []),
    ...(transaction.counterparty?.handle
      ? [
          {
            label: counterpartyLabel,
            value: `@${transaction.counterparty.handle}`,
            ltr: true,
          },
        ]
      : []),
    ...(transaction.note
      ? [{ label: t("detail.description"), value: transaction.note }]
      : []),
    ...(transaction.order?.orderNumber
      ? [
          {
            label: t("detail.order"),
            value: transaction.order.orderNumber,
            ltr: true,
          },
        ]
      : []),
    ...(transaction.order?.invoiceNumber
      ? [
          {
            label: t("detail.invoice"),
            value: transaction.order.invoiceNumber,
            ltr: true,
          },
        ]
      : []),
  ];

  /* The payout arithmetic, only where the server sent a split to explain. */
  const absorbed = (breakdown?.shippingAmount ?? 0) > 0;
  const splitRows = breakdown
    ? ([
        { label: t("detail.itemPrice"), value: money(breakdown.grossAmount) },
        {
          label: t("detail.platformFee"),
          value:
            breakdown.platformFeeAmount == null
              ? null
              : `− ${formatPrice(breakdown.platformFeeAmount, currency)}`,
        },
        absorbed
          ? {
              label: t("detail.shippingDeducted"),
              value: `− ${formatPrice(breakdown.shippingAmount, currency)}`,
            }
          : (breakdown.shippingChargedToBuyer ?? 0) > 0
            ? {
                label: t("detail.shippingBuyerPaid"),
                value: formatPrice(breakdown.shippingChargedToBuyer, currency),
              }
            : { label: "", value: null },
        {
          label: t("detail.netEarnings"),
          value: money(breakdown.netAmount ?? transaction.amount),
          strong: true,
        },
      ].filter((row) => row.value != null) as {
        label: string;
        value: string;
        strong?: boolean;
      }[])
    : [];

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/account/wallet" className="text-caption text-action">
                {t("title")}
              </Link>
            </li>
            <ChevronRight
              className="text-ink-tertiary size-3 rtl:rotate-180"
              aria-hidden
            />
            <li className="text-caption text-ink-tertiary" aria-current="page">
              {t("detail.title")}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="overview" />

          <section className="border-line bg-base flex min-w-0 flex-1 flex-col overflow-hidden rounded-16 border">
            <header className="border-line flex flex-col items-center gap-3 border-b p-8">
              <span
                className={`flex size-16 items-center justify-center rounded-full ${
                  credit ? "bg-action-tint text-action" : "bg-tint text-ink-secondary"
                }`}
                aria-hidden
              >
                <Icon className="size-7 rtl:-scale-x-100" />
              </span>
              <p
                className={`text-[32px] leading-none font-bold ${
                  credit ? "text-action" : "text-ink"
                }`}
                dir="ltr"
              >
                {credit ? "+" : "−"}
                {formatPrice(transaction.amount, currency)}
              </p>
              {transaction.note && (
                <p className="text-body text-ink-secondary text-center" dir="auto">
                  {transaction.note}
                </p>
              )}
            </header>

            {/* The item the money is about, as a card rather than an id. */}
            {listing && (
              <div className="border-line border-b p-4">
                <Link
                  href={`/products/${listingHref}`}
                  className="hover:bg-surface flex items-center gap-3 rounded-12 p-2"
                >
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={thumbnail}
                      alt=""
                      className="bg-tint size-14 rounded-10 object-cover"
                    />
                  ) : (
                    <span className="bg-tint size-14 rounded-10" aria-hidden />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-caption text-ink-tertiary">
                      {t("detail.item")}
                    </span>
                    <span className="text-label truncate" dir="auto">
                      {listing.title}
                    </span>
                  </span>
                  <ChevronRight
                    className="text-ink-tertiary ms-auto size-4 shrink-0 rtl:rotate-180"
                    aria-hidden
                  />
                </Link>
              </div>
            )}

            <dl className="p-2">
              {rows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex justify-between gap-6 px-4 py-3 ${
                    index % 2 === 1 ? "bg-surface" : ""
                  }`}
                >
                  <dt className="text-caption text-ink-tertiary shrink-0">
                    {row.label}
                  </dt>
                  <dd
                    className="text-caption min-w-0 text-end break-all"
                    dir={row.ltr ? "ltr" : "auto"}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {splitRows.length > 0 && (
              <dl className="border-line border-t p-2">
                {splitRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-6 px-4 py-3"
                  >
                    <dt
                      className={`shrink-0 ${
                        row.strong ? "text-label" : "text-caption text-ink-tertiary"
                      }`}
                    >
                      {row.label}
                    </dt>
                    <dd
                      className={`min-w-0 text-end ${
                        row.strong ? "text-label font-semibold" : "text-caption"
                      }`}
                      dir="ltr"
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* More than one line on the order — the payout covers all of them. */}
            {transaction.items && transaction.items.length > 1 && (
              <div className="border-line border-t p-4">
                <h2 className="text-caption text-ink-tertiary mb-2">
                  {t("detail.lineItems")}
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {transaction.items.map((item) => (
                    <li
                      key={item.id}
                      className="text-caption flex justify-between gap-4"
                    >
                      <span className="min-w-0 truncate" dir="auto">
                        {item.title}
                      </span>
                      {item.price != null && (
                        <span className="shrink-0" dir="ltr">
                          {formatPrice(item.price, currency)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {transaction.order?.id && (
              <div className="border-line border-t p-4">
                <Link
                  href={`/account/orders/${transaction.order.id}/invoice`}
                  className="text-caption text-action inline-flex items-center gap-1.5"
                >
                  <Receipt className="size-3.5" aria-hidden />
                  {t("detail.downloadReceipt")}
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getWallet,
  getWalletTransaction,
  getWalletTransactions,
} from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { isCredit } from "@/lib/api/schemas/wallet";
import { resolveMediaUrl } from "@/lib/api/media";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import type { Locale } from "@/i18n/routing";

/**
 * Transaction detail — Figma `651:10726`. Two columns: the detail card, and a
 * rail carrying the mini balance and the recent-transactions list.
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
 *
 * The frame's "Completed" badge has no field behind it (GAP-91). It is true by
 * construction — the ledger only holds settled movements, and money that has
 * not cleared sits in `pendingBalance` instead of as a row — so the badge is
 * rendered rather than dropped.
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
  const [wallet, recent] = await Promise.all([
    getWallet(),
    getWalletTransactions({ limit: 4 }),
  ]);

  const credit = isCredit(transaction);
  const currency = transaction.currency ?? wallet.currency ?? "SAR";
  const Icon = credit ? ArrowDownLeft : ArrowUpRight;
  const reasonKey = transaction.reason ?? "";
  const breakdown = transaction.breakdown;

  const listing = transaction.listing;
  const thumbnail = resolveMediaUrl(listing?.coverPhotoUrl);
  const listingHref = listing?.id ?? transaction.listingId;

  const typeLabel = t.has(`reasons.${reasonKey}`)
    ? t(`reasons.${reasonKey}`)
    : (transaction.label ?? t(`filters.${credit ? "credit" : "debit"}`));

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
    { label: t("detail.type"), value: typeLabel },
    ...(transaction.createdAt
      ? [
          {
            label: t("detail.date"),
            value: formatDateTime(transaction.createdAt, activeLocale),
          },
        ]
      : []),
    ...(listing?.title
      ? [{ label: t("detail.item"), value: listing.title }]
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
      ].filter((row) => row.value != null) as {
        label: string;
        value: string;
      }[])
    : [];

  const netEarnings = breakdown
    ? money(breakdown.netAmount ?? transaction.amount)
    : null;

  const detailRow = "flex justify-between gap-6 py-2 text-[13px]";

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* R — 651:10752 */}
          <Breadcrumbs
            items={[
              { label: t("walletCrumb"), href: "/account/wallet" },
              { label: t("detail.title") },
            ]}
          />

          {/* R — 651:10756 */}
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            {/* DetCard — 651:10757 */}
            <section className="border-line-200 bg-base flex min-w-0 flex-1 flex-col gap-5 rounded-16 border p-8">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`flex size-16 items-center justify-center rounded-[32px] ${
                    credit
                      ? "bg-action-tint text-action"
                      : "bg-error-tint text-error"
                  }`}
                  aria-hidden
                >
                  <Icon className="size-7 rtl:-scale-x-100" />
                </span>
                <p
                  className={`text-[36px] leading-none font-bold ${
                    credit ? "text-action" : "text-error"
                  }`}
                  dir="ltr"
                >
                  {credit ? "+" : "−"}
                  {formatPrice(transaction.amount, currency)}
                </p>
                <p className="text-ink-500 text-center text-[16px]" dir="auto">
                  {transaction.note ?? typeLabel}
                </p>
                {/* StatusBdg — 651:10763 */}
                <span className="bg-action-tint text-action flex h-7 items-center rounded-[14px] px-3.5 text-[12px] font-bold">
                  {t("detail.completed")}
                </span>
              </div>

              <span className="bg-line-200 h-px w-full" aria-hidden />

              <h2 className="text-ink-900 text-[14px] font-semibold">
                {t("detail.title")}
              </h2>

              {/* The item the money is about, as a card rather than an id. */}
              {listing && (
                <Link
                  href={`/products/${listingHref}`}
                  className="hover:bg-surface -mx-2 flex items-center gap-3 rounded-12 p-2"
                >
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={thumbnail}
                      alt=""
                      className="bg-tint size-11 rounded-8 object-cover"
                    />
                  ) : (
                    <span className="bg-tint size-11 rounded-8" aria-hidden />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-ink-500 text-[11px]">
                      {t("detail.viewItem")}
                    </span>
                    <span
                      className="text-ink-900 truncate text-[13px]"
                      dir="auto"
                    >
                      {listing.title}
                    </span>
                  </span>
                  <ChevronRight
                    className="text-ink-400 ms-auto size-4 shrink-0 rtl:rotate-180"
                    aria-hidden
                  />
                </Link>
              )}

              {/* R — 651:10767 */}
              <dl className="flex flex-col">
                {rows.map((row) => (
                  <div key={row.label} className={detailRow}>
                    <dt className="text-ink-500 shrink-0">{row.label}</dt>
                    <dd
                      className="text-ink-900 min-w-0 text-end break-all"
                      dir={row.ltr ? "ltr" : "auto"}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
                {splitRows.map((row) => (
                  <div key={row.label} className={detailRow}>
                    <dt className="text-ink-500 shrink-0">{row.label}</dt>
                    <dd className="text-ink-900 min-w-0 text-end" dir="ltr">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {netEarnings && (
                <>
                  <span className="bg-line-200 h-px w-full" aria-hidden />
                  <div className={detailRow}>
                    <span className="text-ink-500">
                      {t("detail.netEarnings")}
                    </span>
                    <span className="text-action font-bold" dir="ltr">
                      {netEarnings}
                    </span>
                  </div>
                </>
              )}

              {/* More than one line on the order — the payout covers all of them. */}
              {transaction.items && transaction.items.length > 1 && (
                <>
                  <span className="bg-line-200 h-px w-full" aria-hidden />
                  <div>
                    <h3 className="text-ink-500 mb-2 text-[12px]">
                      {t("detail.lineItems")}
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {transaction.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-4 text-[12px]"
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
                </>
              )}

              <span className="bg-line-200 h-px w-full" aria-hidden />

              {/* R — 651:10796 */}
              <div className="flex flex-wrap gap-3">
                {transaction.order?.id && (
                  <Link
                    href={`/account/orders/${transaction.order.id}/invoice`}
                    className="border-line-200 text-ink-900 flex h-11 flex-1 items-center justify-center rounded-[22px] border text-[13px] font-medium"
                  >
                    {t("detail.downloadReceipt")}
                  </Link>
                )}
                <Link
                  href="/account/wallet"
                  className="bg-action text-base flex h-11 flex-1 items-center justify-center rounded-[22px] text-[13px] font-bold"
                >
                  {t("detail.backToWallet")}
                </Link>
              </div>
            </section>

            {/* C — 651:10801 */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[420px]">
              {/* MiniBal — 651:10802 */}
              <section className="bg-ink-900 flex flex-col gap-2 rounded-[14px] p-5">
                <p className="text-ink-500 text-[12px]">
                  {t("detail.walletBalance")}
                </p>
                <p
                  className="text-base text-[24px] leading-none font-bold"
                  dir="ltr"
                >
                  {formatPrice(wallet.balance, currency)}
                </p>
                <p className="text-ink-500 text-[11px]">
                  {t("detail.afterThisTransaction")}
                </p>
                <div className="mt-1 flex gap-2.5">
                  <Link
                    href="/account/wallet/add-funds"
                    className="bg-action text-base flex h-9 flex-1 items-center justify-center rounded-[18px] text-[12px] font-bold"
                  >
                    {t("addFunds")}
                  </Link>
                  <Link
                    href="/account/wallet/withdraw"
                    className="bg-base text-action flex h-9 flex-1 items-center justify-center rounded-[18px] text-[12px]"
                  >
                    {t("withdraw")}
                  </Link>
                </div>
              </section>

              {/* RecentCard — 651:10811 */}
              <section className="border-line-200 bg-base flex flex-col rounded-[14px] border px-4 pt-4 pb-1">
                <div className="flex items-center justify-between pb-3.5">
                  <h2 className="text-ink-900 text-[14px] font-semibold">
                    {t("detail.recentTransactions")}
                  </h2>
                  <Link
                    href="/account/wallet/history"
                    className="text-action text-[11px] font-medium"
                  >
                    {t("viewAll")}
                  </Link>
                </div>

                <ul className="divide-line-200 divide-y border-t border-line-200">
                  {recent.items.map((row) => {
                    const rowCredit = isCredit(row);
                    return (
                      <li key={row.id}>
                        {/* R — 651:10816 */}
                        <Link
                          href={`/account/wallet/transactions/${row.id}`}
                          className="flex items-center gap-3 py-3"
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-16 text-[14px] font-bold ${
                              rowCredit
                                ? "bg-action-tint text-action"
                                : "bg-error-tint text-error"
                            }`}
                            aria-hidden
                          >
                            {rowCredit ? "+" : "−"}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span
                              className="text-ink-900 truncate text-[12px]"
                              dir="auto"
                            >
                              {row.note ??
                                row.listing?.title ??
                                row.label ??
                                t("transaction")}
                            </span>
                            <span className="text-ink-400 text-[10px]">
                              {row.createdAt
                                ? formatDate(row.createdAt, activeLocale)
                                : ""}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-[13px] font-bold ${
                              rowCredit ? "text-action" : "text-error"
                            }`}
                            dir="ltr"
                          >
                            {rowCredit ? "+" : "−"}
                            {formatPrice(row.amount, row.currency ?? currency)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

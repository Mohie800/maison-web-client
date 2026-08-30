import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getWallet,
  getWalletEarnings,
  getWalletTransactions,
} from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { WITHDRAW_MIN } from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { TransactionRow } from "@/features/wallet/components/transaction-row";

/**
 * Earnings — Figma `651:10582`.
 *
 * The three stat cards map cleanly: "Available to withdraw" is the wallet
 * balance, "Pending clearance" is `pendingBalance`, "Lifetime earnings" is
 * `totalEarnings`. `GET /wallet/earnings` adds total withdrawn and items sold,
 * which the design doesn't show but are worth surfacing since we have them.
 *
 * "Recent sales" is fed from `?group=sales`, whose rows now carry the item's
 * title and cover photo alongside the payout (GAP-38) — so the list renders as
 * the design's item cards rather than as bare amounts. The group is used rather
 * than `?reason=sale_earnings` so refunds against a sale stay with it.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WalletEarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Wallet");

  const [wallet, earnings, sales] = await Promise.all([
    getWallet(),
    getWalletEarnings(),
    getWalletTransactions({ group: "sales", limit: 10 }),
  ]);

  const currency = earnings.currency ?? wallet.currency ?? "SAR";

  /* Only cards the payload supports; a null total is absent, not zero. */
  const cards = [
    { key: "available", value: wallet.balance },
    { key: "pending", value: wallet.pendingBalance },
    { key: "thisMonth", value: earnings.thisMonthEarnings },
    { key: "lifetime", value: earnings.totalEarnings },
    { key: "withdrawn", value: earnings.totalWithdrawn },
  ].filter((c) => c.value != null) as { key: string; value: number }[];

  const canWithdraw = wallet.balance >= WITHDRAW_MIN;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <h1 className="text-h1">{t("earningsTitle")}</h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="earnings" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <li
                  key={card.key}
                  className="border-line bg-base flex flex-col gap-1 rounded-16 border p-5"
                >
                  <span className="text-caption text-ink-tertiary">
                    {t(`earnings.${card.key}`)}
                  </span>
                  <span className="text-[24px] font-bold" dir="ltr">
                    {formatPrice(card.value, currency)}
                  </span>
                </li>
              ))}
            </ul>

            {earnings.totalItemsSold != null && (
              <p className="text-caption text-ink-tertiary">
                {t("itemsSold", { count: earnings.totalItemsSold })}
              </p>
            )}

            <section className="border-line bg-base overflow-hidden rounded-16 border">
              <header className="border-line border-b px-4 py-3">
                <h2 className="text-label">{t("recentSales")}</h2>
              </header>

              {sales.items.length === 0 ? (
                <p className="text-body text-ink-tertiary p-10 text-center">
                  {t("noSales")}
                </p>
              ) : (
                <ul className="divide-line divide-y">
                  {sales.items.map((sale) => (
                    <li key={sale.id}>
                      <TransactionRow transaction={sale} currency={currency} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {canWithdraw && (
              <Link
                href="/account/wallet/withdraw"
                className="bg-aqua text-on-accent text-label flex h-11 w-fit items-center rounded-[22px] px-5 font-semibold"
              >
                {t("withdrawEarnings")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

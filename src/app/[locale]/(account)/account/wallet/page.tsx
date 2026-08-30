import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getWallet,
  getWalletTransactions,
} from "@/lib/api/endpoints/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { BalanceCard } from "@/features/wallet/components/balance-card";
import { TransactionRow } from "@/features/wallet/components/transaction-row";

/**
 * Wallet overview — Figma `651:10180` (Web_Wallet).
 *
 * The whole of Flow 14 was blocked on API-01 until the Round 2 migration landed;
 * these nine screens were the largest single thing it unblocked.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Wallet");
  const query = await searchParams;

  const [wallet, transactions] = await Promise.all([
    getWallet(),
    getWalletTransactions({ limit: 5 }),
  ]);

  const added = typeof query.added === "string" ? query.added : null;
  const withdrew = typeof query.withdrew === "string" ? query.withdrew : null;
  const sent = typeof query.sent === "string" ? query.sent : null;
  const sentTo = typeof query.to === "string" ? query.to : null;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-5">

        {/* Confirmation after a redirect from a mutation. */}
        {(added || withdrew || sent) && (
          <p className="bg-action-tint text-action text-label rounded-12 px-4 py-3">
            {added ? t("addedConfirm", { amount: added }) : null}
            {withdrew ? t("withdrewConfirm", { amount: withdrew }) : null}
            {sent
              ? t("sentConfirm", { amount: sent, recipient: sentTo ?? "" })
              : null}
          </p>
        )}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <WalletNav active="overview" />

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <BalanceCard wallet={wallet} actions />

              {/* TH — 651:10218 */}
              <div className="flex items-center justify-between">
                <h2 className="text-ink-900 text-[18px] font-semibold">
                  {t("recentActivity")}
                </h2>
                <Link
                  href="/account/wallet/history"
                  className="text-action text-[13px] font-medium"
                >
                  {t("viewAll")}
                </Link>
              </div>

              {/* TxCard — 651:10221 */}
              <section className="border-line-200 bg-base overflow-hidden rounded-12 border">
                {transactions.items.length === 0 ? (
                  <p className="text-ink-500 p-8 text-center text-[13px]">
                    {t("noTransactions")}
                  </p>
                ) : (
                  <ul className="divide-fill-100 divide-y">
                    {transactions.items.map((transaction) => (
                      <li key={transaction.id}>
                        <TransactionRow
                          transaction={transaction}
                          currency={wallet.currency ?? "SAR"}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

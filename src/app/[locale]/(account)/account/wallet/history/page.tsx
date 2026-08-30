import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getWallet,
  getWalletTransactions,
  TRANSACTIONS_PAGE_SIZE,
} from "@/lib/api/endpoints/wallet";
import {
  TRANSACTION_GROUPS,
  TRANSACTION_TYPES,
  type TransactionGroup,
  type TransactionType,
} from "@/lib/api/schemas/wallet";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";
import { TransactionRow } from "@/features/wallet/components/transaction-row";
import { Pagination } from "@/features/catalog/components/pagination";

/**
 * Transaction history — Figma `651:10511`.
 *
 * The design's chips are "All · In · Out · Trades · Auctions", and they filter
 * on two different axes: the first three are `?type=`, the rest are `?group=`
 * (GAP-39). One chip row, one selection — picking a group clears the type and
 * vice versa, which is what a single-select row means.
 *
 * `group` is preferred over listing reasons by hand: what counts as auction
 * activity is then decided server-side, once, and the chip keeps working when a
 * reason joins the group. Sales and Transfers are here too, since the same
 * parameter serves them and both now have rows behind them.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WalletHistoryPage({
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

  const rawType = Array.isArray(query.type) ? query.type[0] : query.type;
  const type: TransactionType = TRANSACTION_TYPES.includes(
    rawType as TransactionType,
  )
    ? (rawType as TransactionType)
    : "all";

  const rawGroup = Array.isArray(query.group) ? query.group[0] : query.group;
  const group: TransactionGroup = TRANSACTION_GROUPS.includes(
    rawGroup as TransactionGroup,
  )
    ? (rawGroup as TransactionGroup)
    : "all";

  /* One row of chips over two parameters: the selected one is whichever is set. */
  const selected = group !== "all" ? group : type;
  const CHIPS = [
    { key: "all", param: "type" },
    { key: "credit", param: "type" },
    { key: "debit", param: "type" },
    { key: "sales", param: "group" },
    { key: "trades", param: "group" },
    { key: "auctions", param: "group" },
    { key: "transfers", param: "group" },
  ] as const;

  const rawPage = Number(
    (Array.isArray(query.page) ? query.page[0] : query.page) ?? 1,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const [wallet, transactions] = await Promise.all([
    getWallet(),
    getWalletTransactions({ type, group, page, limit: TRANSACTIONS_PAGE_SIZE }),
  ]);

  const href = (next: {
    type?: TransactionType;
    group?: TransactionGroup;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const merged = { type, group, page, ...next };
    if (merged.type !== "all") params.set("type", merged.type);
    if (merged.group !== "all") params.set("group", merged.group);
    if (merged.page > 1) params.set("page", String(merged.page));
    const q = params.toString();
    return `/account/wallet/history${q ? `?${q}` : ""}`;
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="wallet" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <h1 className="text-h1">{t("historyTitle")}</h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <WalletNav active="history" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <ul className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => {
                const active = chip.key === selected;
                const target =
                  chip.param === "type"
                    ? { type: chip.key as TransactionType, group: "all" as const }
                    : { group: chip.key as TransactionGroup, type: "all" as const };
                return (
                  <li key={chip.key}>
                    <Link
                      href={href({ ...target, page: 1 })}
                      aria-pressed={active}
                      className={`text-caption rounded-[16px] border px-3.5 py-1.5 ${
                        active
                          ? "border-action bg-action-tint text-action font-semibold"
                          : "border-line text-ink-secondary hover:border-ink-tertiary"
                      }`}
                    >
                      {t(`filters.${chip.key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <section className="border-line bg-base overflow-hidden rounded-16 border">
              {transactions.items.length === 0 ? (
                <p className="text-body text-ink-tertiary p-10 text-center">
                  {t("noTransactions")}
                </p>
              ) : (
                <ul className="divide-line divide-y">
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

            <Pagination
              page={page}
              total={transactions.total}
              pageSize={TRANSACTIONS_PAGE_SIZE}
              buildHref={(next) => href({ page: next })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

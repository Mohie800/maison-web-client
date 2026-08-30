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
import { formatDate } from "@/lib/format/date";
import { resolveMediaUrl } from "@/lib/api/media";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { WalletNav } from "@/features/wallet/components/wallet-nav";

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
 *
 * The frame's sub-line reads "Sold 3 Jul · after VAT + 1% fee". The rate isn't
 * published anywhere, so the row says the amount is net without naming a
 * percentage we would be inventing.
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
  const localeTag = locale as Parameters<typeof formatDate>[1];

  const [wallet, earnings, sales] = await Promise.all([
    getWallet(),
    getWalletEarnings(),
    getWalletTransactions({ group: "sales", limit: 10 }),
  ]);

  const currency = earnings.currency ?? wallet.currency ?? "SAR";

  /* Only cards the payload supports; a null total is absent, not zero. */
  const cards = [
    { key: "available", value: wallet.balance, tone: "" },
    { key: "pending", value: wallet.pendingBalance, tone: "text-warning" },
    { key: "lifetime", value: earnings.totalEarnings, tone: "text-success" },
    { key: "thisMonth", value: earnings.thisMonthEarnings, tone: "" },
    { key: "withdrawn", value: earnings.totalWithdrawn, tone: "" },
  ].filter((c) => c.value != null) as {
    key: string;
    value: number;
    tone: string;
  }[];

  const canWithdraw = wallet.balance >= WITHDRAW_MIN;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
      <h1 className="text-ink-900 pb-6 text-[28px] font-bold">
        {t("accountTitle")}
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AccountSidebar active="wallet" />

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
          <WalletNav active="earnings" />

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* card — 651:10607 */}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <li
                  key={card.key}
                  className="border-line bg-base flex flex-col gap-1.5 rounded-16 border p-5"
                >
                  <span className="text-caption text-ink-tertiary font-medium">
                    {t(`earnings.${card.key}`)}
                  </span>
                  <span
                    className={`text-[24px] font-extrabold ${card.tone}`}
                    dir="ltr"
                  >
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

            {/* card — 651:10616 */}
            <section className="border-line bg-base flex flex-col gap-4 rounded-16 border p-6">
              <h2 className="text-[16px] font-semibold">{t("recentSales")}</h2>

              {sales.items.length === 0 ? (
                <p className="text-body text-ink-tertiary py-6 text-center">
                  {t("noSales")}
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {sales.items.map((sale) => {
                    const cover = resolveMediaUrl(sale.listing?.coverPhotoUrl);
                    return (
                      <li key={sale.id}>
                        <Link
                          href={`/account/wallet/transactions/${sale.id}`}
                          className="flex items-center gap-3"
                        >
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                            <img
                              src={cover}
                              alt=""
                              className="bg-tint size-11 shrink-0 rounded-8 object-cover"
                            />
                          ) : (
                            <span
                              className="bg-tint size-11 shrink-0 rounded-8"
                              aria-hidden
                            />
                          )}
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span
                              className="truncate text-[14px] font-semibold"
                              dir="auto"
                            >
                              {sale.listing?.title ??
                                sale.note ??
                                t("transaction")}
                            </span>
                            <span className="text-ink-tertiary truncate text-[12px]">
                              {sale.createdAt
                                ? t("soldLine", {
                                    date: formatDate(sale.createdAt, localeTag),
                                  })
                                : t("soldLineNoDate")}
                            </span>
                          </span>
                          <span
                            className="text-success shrink-0 text-[14px] font-bold"
                            dir="ltr"
                          >
                            {formatPrice(sale.amount, currency)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {canWithdraw && (
                /* btn/primary — 651:10634 */
                <Link
                  href="/account/wallet/withdraw"
                  className="bg-aqua text-on-accent mt-2 flex h-11 w-[200px] items-center justify-center rounded-12 text-[14px] font-semibold"
                >
                  {t("withdrawEarnings")}
                </Link>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

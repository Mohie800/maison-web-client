import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getBankAccounts,
  getWallet,
  getWalletEarnings,
  getWalletTransactions,
} from "@/lib/api/endpoints/wallet";
import { formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";

/**
 * Payouts — `651:15527` light / `651:12949` dark.
 *
 * **Built on the wallet, not on `/vendor-portal/payouts/*`.** Those two
 * endpoints do not see withdrawals: we seeded a real one (SAR 50 to a linked
 * Al Rajhi account, `201`, wallet balance 807.50 → 757.50, ledger row
 * `reason: "withdrawal"`, `earnings.totalWithdrawn: 50`) and
 * `/payouts/history` stayed `{items: [], total: 0}`, `summary.totalPaid` stayed
 * `0`, and `payoutDestination` stayed `null` with a default bank linked. Their
 * `availableBalance` also disagrees with `/wallet` — 1937.50 against 757.50.
 * See GAP-106.
 *
 * `/wallet`, `/wallet/earnings`, `/wallet/banks` and
 * `/wallet/transactions?reason=withdrawal` carry all of it correctly, so the
 * screen is complete rather than blocked.
 *
 * Two things the frame draws are still absent: **Download CSV** (no export
 * endpoint) and the **"· 12 orders"** count on each payout row — a withdrawal
 * is an amount, not a set of orders (plans/09 C80).
 */
export const metadata: Metadata = { robots: { index: false } };

const TONE: Record<string, string> = {
  completed: "bg-vp-action text-action dark:text-aqua",
  pending: "bg-vp-warn text-amber-deep",
  failed: "bg-vp-error text-error",
};

export default async function VendorPayoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Vendor.payouts");
  const activeLocale = (await getLocale()) as Locale;

  const [wallet, earnings, banks, history] = await Promise.all([
    getWallet().catch(() => null),
    getWalletEarnings().catch(() => null),
    getBankAccounts().catch(() => []),
    getWalletTransactions({ reason: "withdrawal", limit: 20 }).catch(() => null),
  ]);

  const currency = wallet?.currency ?? "SAR";
  const destination = banks.find((b) => b.isDefault) ?? banks[0];

  return (
    <>
      {/* TB — 651:15578 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
          {t("title")}
        </h1>
        <Link
          href="/account/wallet/withdraw"
          className="bg-action text-base flex h-10 shrink-0 items-center rounded-[20px] px-5 text-[13px] font-bold"
        >
          {t("request")}
        </Link>
      </div>

      {/* BalCard — 651:15584 */}
      <section className="bg-vp-action border-action flex flex-wrap items-center gap-6 rounded-[16px] border p-7">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-action dark:text-aqua text-[13px]">
            {t("available")}
          </p>
          <p className="text-action dark:text-aqua text-[40px] leading-none font-bold">
            {formatPrice(wallet?.balance ?? 0, currency)}
          </p>
        </div>
        <div className="flex shrink-0 gap-8">
          <div className="flex flex-col items-center gap-1">
            <p className="text-ink-900 text-[18px] font-bold">
              {formatPrice(earnings?.totalEarnings ?? 0, currency)}
            </p>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("totalEarned")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-ink-900 text-[18px] font-bold">
              {formatPrice(wallet?.pendingBalance ?? 0, currency)}
            </p>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("pending")}
            </p>
          </div>
        </div>
      </section>

      {/* Dest — 651:15596 */}
      <section className="bg-base dark:bg-tint border-line-200 flex flex-wrap items-center gap-4 rounded-[14px] border px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="text-ink-900 text-[13px] font-semibold">
            {t("destination")}
          </p>
          {destination ? (
            <>
              <p className="text-ink-500 dark:text-ink-450 truncate text-[12px]">
                {destination.bankName} · {destination.ibanMasked}
              </p>
              <p className="text-ink-400 dark:text-ink-450 text-[11px]">
                {t("arrival")}
              </p>
            </>
          ) : (
            <p className="text-ink-500 dark:text-ink-450 text-[12px]">
              {t("destinationNone")}
            </p>
          )}
        </div>
        <Link
          href="/account/wallet/banks"
          className="border-line-200 text-ink-900 rounded-8 flex h-9 shrink-0 items-center border px-4 text-[12px]"
        >
          {destination ? t("change") : t("add")}
        </Link>
      </section>

      {/* Hist — 651:15603 */}
      <section className="bg-base dark:bg-tint border-line-200 flex flex-col rounded-[14px] border px-5 py-4">
        <h2 className="text-ink-900 pb-3.5 text-[14px] font-semibold">
          {t("history")}
        </h2>

        {(history?.items ?? []).length === 0 ? (
          <p className="text-ink-500 dark:text-ink-450 py-3 text-[13px]">
            {t("empty")}
          </p>
        ) : (
          (history?.items ?? []).map((row, index) => (
            <div key={row.id}>
              {index > 0 && (
                <span className="bg-line-200 block h-px w-full" aria-hidden />
              )}
              {/* HR — 651:15607 */}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <p className="text-ink-900 text-[14px] font-bold">
                    {formatPrice(row.amount, row.currency ?? currency)}
                  </p>
                  <p className="text-ink-500 dark:text-ink-450 truncate text-[11px]">
                    {formatDate(row.createdAt, activeLocale)}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span
                  className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[10px] font-bold ${
                    TONE[String(row.status)] ??
                    "bg-fill-100 text-ink-500 dark:text-ink-450"
                  }`}
                >
                  {t(`statuses.${row.status}`)}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

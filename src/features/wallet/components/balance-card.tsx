import { getTranslations } from "next-intl/server";
import { Plus, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import type { WalletBalance } from "@/lib/api/schemas/wallet";

/**
 * Balance card — Figma `651:10208`, repeated at the top of Add Funds
 * (`651:10318`) and Withdraw (`651:10418`).
 *
 * The design's sub-line reads "Pending: SAR 120 from recent sale". The API
 * returns `pendingBalance` but nothing about where it came from, so the line
 * renders without the attribution rather than inventing one — and only when
 * there is actually something pending.
 */
export async function BalanceCard({
  wallet,
  actions = false,
}: {
  wallet: WalletBalance;
  actions?: boolean;
}) {
  const t = await getTranslations("Wallet");
  const currency = wallet.currency ?? "SAR";
  const pending = wallet.pendingBalance ?? 0;

  return (
    <section className="border-line bg-base flex flex-wrap items-end justify-between gap-6 rounded-16 border p-6">
      <div className="flex flex-col gap-1">
        <p className="text-caption text-ink-tertiary">{t("availableBalance")}</p>
        {/* dir="ltr": a currency amount must not be reordered in Arabic. */}
        <p className="text-[36px] leading-none font-bold" dir="ltr">
          {formatPrice(wallet.balance, currency)}
        </p>
        {pending > 0 && (
          <p className="text-caption text-ink-tertiary">
            {t("pendingAmount", { amount: formatPrice(pending, currency) })}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex gap-3">
          <Link
            href="/account/wallet/add-funds"
            className="bg-aqua text-on-accent text-label flex h-11 items-center gap-2 rounded-[22px] px-5 font-semibold"
          >
            <Plus className="size-4" aria-hidden />
            {t("addFunds")}
          </Link>
          <Link
            href="/account/wallet/withdraw"
            className="border-ink text-label flex h-11 items-center gap-2 rounded-[22px] border px-5 font-semibold"
          >
            <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("withdraw")}
          </Link>
        </div>
      )}
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { Plus, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import type { WalletBalance } from "@/lib/api/schemas/wallet";

/**
 * Balance card — Figma `651:10208`, repeated smaller at the top of Add Funds
 * (`651:10318`) and Withdraw (`651:10418`): 28px amount, 24/20 padding.
 *
 * The design's sub-line reads "Pending: SAR 120 from recent sale". The API
 * returns `pendingBalance` but nothing about where it came from, so the line
 * renders without the attribution rather than inventing one — and only when
 * there is actually something pending.
 *
 * `ink-900` and `base` both flip with the theme, so the card inverts as a pair
 * and the balance keeps its contrast either way.
 */
export async function BalanceCard({
  wallet,
  actions = false,
  compact = false,
}: {
  wallet: WalletBalance;
  actions?: boolean;
  /** The shorter card the Add Funds and Withdraw frames put above the form. */
  compact?: boolean;
}) {
  const t = await getTranslations("Wallet");
  const currency = wallet.currency ?? "SAR";
  const pending = wallet.pendingBalance ?? 0;

  return (
    <section
      className={`bg-ink-900 flex flex-wrap items-center justify-between gap-6 rounded-16 ${
        compact ? "px-6 py-5" : "p-7"
      }`}
    >
      <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
        <p
          className={
            compact ? "text-ink-500 text-[12px]" : "text-ink-400 text-[13px]"
          }
        >
          {t("availableBalance")}
        </p>
        {/* dir="ltr": a currency amount must not be reordered in Arabic. */}
        <p
          className={`text-base leading-none font-bold ${
            compact ? "text-[28px]" : "text-[36px]"
          }`}
          dir="ltr"
        >
          {formatPrice(wallet.balance, currency)}
        </p>
        {pending > 0 && (
          <p
            className={`text-ink-500 ${compact ? "text-[11px]" : "text-[12px]"}`}
          >
            {t("pendingAmount", { amount: formatPrice(pending, currency) })}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex gap-3">
          <Link
            href="/account/wallet/add-funds"
            className="bg-aqua text-on-accent flex h-11 items-center gap-2 rounded-[22px] px-5 text-[13px] font-bold"
          >
            <Plus className="size-4" aria-hidden />
            {t("addFunds")}
          </Link>
          <Link
            href="/account/wallet/withdraw"
            className="border-ink-700 text-base flex h-11 items-center gap-2 rounded-[22px] border px-5 text-[13px] font-medium"
          >
            <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("withdraw")}
          </Link>
        </div>
      )}
    </section>
  );
}

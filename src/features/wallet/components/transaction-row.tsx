import { getTranslations, getLocale } from "next-intl/server";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Gavel,
  Repeat,
  RotateCcw,
  Send,
  Settings2,
  Tag,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import { formatDateTime } from "@/lib/format/date";
import { isCredit, type WalletTransaction } from "@/lib/api/schemas/wallet";
import { resolveMediaUrl } from "@/lib/api/media";
import type { Locale } from "@/i18n/routing";

/**
 * One transaction row — Figma `651:10222` (overview) and `651:10546` (history).
 * The two frames disagree and sit on different token families, so `variant`
 * picks between them: the overview row is 36px/13px with tinted debit red, the
 * history row is 40px/14px with credits in `success` and debits in plain ink.
 *
 * The icon is chosen from `reason`, which is a closed enum, so an unknown value
 * falls back to a direction arrow rather than rendering nothing.
 *
 * The row's label prefers the server's own `note` ("Wallet top-up via card",
 * "Withdrawal to Al Rajhi Bank (7519)"). Those strings are English-only, which
 * is a gap on the Arabic side — but they carry detail we have no other source
 * for, such as *which* bank a withdrawal went to. The translated reason is the
 * fallback when `note` is absent, and the server's `label` behind that, so a
 * reason we haven't translated yet still reads as words.
 *
 * Sales carry the item's cover photo and transfers carry the other party, both
 * since GAP-38 — so the row shows what the transaction was about rather than
 * only how much it moved.
 */
const ICONS: Record<string, typeof ArrowDownLeft> = {
  topup: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  sale_earnings: Tag,
  refund_received: RotateCcw,
  referral_bonus_referrer: Gift,
  referral_bonus_referee: Gift,
  auction_entry_fee_refund: Gavel,
  auction_non_payment_penalty: Gavel,
  admin_adjustment: Settings2,
  transfer_sent: Send,
  transfer_received: ArrowDownLeft,
  trade_settlement: Repeat,
};

export async function TransactionRow({
  transaction,
  currency = "SAR",
  variant = "overview",
}: {
  transaction: WalletTransaction;
  currency?: string;
  variant?: "overview" | "history";
}) {
  const t = await getTranslations("Wallet");
  const locale = (await getLocale()) as Locale;

  const credit = isCredit(transaction);
  const Icon =
    ICONS[transaction.reason ?? ""] ?? (credit ? ArrowDownLeft : ArrowUpRight);

  const reasonKey = transaction.reason ?? "";
  const label =
    transaction.note ??
    (t.has(`reasons.${reasonKey}`)
      ? t(`reasons.${reasonKey}`)
      : (transaction.label ?? t("transaction")));

  const thumbnail = resolveMediaUrl(transaction.listing?.coverPhotoUrl);
  const handle = transaction.counterparty?.handle;
  const history = variant === "history";

  return (
    <Link
      href={`/account/wallet/transactions/${transaction.id}`}
      className={`hover:bg-surface flex items-center ${
        history ? "gap-3 px-5 py-3" : "gap-3.5 px-4 py-3.5"
      }`}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
        <img
          src={thumbnail}
          alt=""
          className={`bg-fill-100 shrink-0 rounded-full object-cover ${
            history ? "size-10" : "size-9"
          }`}
        />
      ) : (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${
            history ? "bg-tint text-ink-secondary size-10" : "size-9"
          } ${
            history
              ? ""
              : credit
                ? "bg-action-tint text-action"
                : "bg-error-tint text-error"
          }`}
          aria-hidden
        >
          <Icon className="size-4 rtl:-scale-x-100" />
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate ${
            history ? "text-[14px] font-semibold" : "text-ink-700 text-[13px]"
          }`}
          dir="auto"
        >
          {label}
        </span>
        <span
          className={`truncate ${
            history
              ? "text-ink-tertiary text-[12px]"
              : "text-ink-400 text-[11px]"
          }`}
        >
          {handle && <span dir="ltr">@{handle}</span>}
          {handle && transaction.createdAt ? " · " : ""}
          {transaction.createdAt
            ? formatDateTime(transaction.createdAt, locale)
            : !handle && t.has(`reasons.${reasonKey}`)
              ? t(`reasons.${reasonKey}`)
              : ""}
        </span>
      </span>

      {/* Sign carries the meaning, so it is text rather than colour alone. */}
      <span
        className={`shrink-0 text-[14px] font-bold ${
          history
            ? credit
              ? "text-success"
              : ""
            : credit
              ? "text-action"
              : "text-error"
        }`}
        dir="ltr"
      >
        {credit ? "+" : "−"}
        {formatPrice(transaction.amount, currency)}
      </span>
    </Link>
  );
}

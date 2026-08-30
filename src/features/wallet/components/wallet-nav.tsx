import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Wallet sub-navigation — the `wnav` rail in Figma `651:10519`, which appears
 * on five of the nine wallet frames and is the flow's canonical IA.
 *
 * All eight destinations, in the design's order. Send was the one that had no
 * endpoint behind it until `POST /wallet/send` shipped (GAP-40).
 */
const ITEMS = [
  { key: "overview", href: "/account/wallet" },
  { key: "addFunds", href: "/account/wallet/add-funds" },
  { key: "withdraw", href: "/account/wallet/withdraw" },
  { key: "send", href: "/account/wallet/send" },
  { key: "history", href: "/account/wallet/history" },
  { key: "earnings", href: "/account/wallet/earnings" },
  { key: "paymentMethods", href: "/account/wallet/payment-methods" },
  { key: "banks", href: "/account/wallet/banks" },
] as const;

export type WalletSection = (typeof ITEMS)[number]["key"];

export async function WalletNav({ active }: { active: WalletSection }) {
  const t = await getTranslations("Wallet");

  return (
    <nav aria-label={t("title")} className="w-full shrink-0 lg:w-[240px]">
      <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`text-label flex h-9 items-center rounded-10 px-4 whitespace-nowrap ${
                  isActive
                    ? "bg-action-tint text-action font-semibold"
                    : "text-ink-secondary hover:bg-tint"
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

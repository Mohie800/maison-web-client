import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAddresses, getPaymentMethods } from "@/lib/api/endpoints/checkout";
import { getWallet } from "@/lib/api/endpoints/wallet";
import { getWishlist } from "@/lib/api/endpoints/wishlist";
import { getNotificationPreferences } from "@/lib/api/endpoints/settings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { ThemeToggleRow } from "@/features/settings/components/theme-toggle-row";

/**
 * Settings — Figma `651:9539` (Web_Settings, the index): a profile card, then
 * grouped rows whose trailing text is the current value.
 *
 * Every row's value is read rather than written in: "2 saved" is the address
 * count, "Visa ••4242" the default card, "Push, Email" the channels actually
 * enabled. A row with nothing behind it would be worse than no row.
 *
 * Two frame rows are omitted, recorded in plans/09 C37: **Premium Mode**, which
 * has no subscription endpoint of any kind, and **Payout Settings**, which is
 * the wallet's bank list and is already linked from there.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Settings");

  const [user, addresses, cards, wallet, wishlist, prefs] = await Promise.all([
    getCurrentUser(),
    getAddresses().catch(() => []),
    getPaymentMethods().catch(() => []),
    getWallet().catch(() => null),
    getWishlist().catch(() => null),
    getNotificationPreferences().catch(() => null),
  ]);

  const card = cards.find((each) => each.isDefault) ?? cards[0] ?? null;

  // "Push, Email" — the channels on for at least one category.
  const channels = prefs
    ? (["push", "email", "sms"] as const).filter((channel) =>
        Object.values(prefs).some((group) => group?.[channel]),
      )
    : [];

  const groups = [
    {
      key: "account",
      rows: [
        {
          key: "personal",
          href: "/account/settings/profile",
          value: t("rows.edit"),
        },
        {
          key: "addresses",
          href: "/checkout/shipping",
          value: t("rows.saved", { count: addresses.length }),
        },
        {
          key: "payment",
          href: "/account/wallet/payment-methods",
          value: card
            ? `${card.cardBrand ?? t("rows.card")} ••${card.cardLast4 ?? "••••"}`
            : t("rows.none"),
        },
        {
          key: "payout",
          href: "/account/wallet/banks",
          value: t("rows.bankAccount"),
        },
      ],
    },
    {
      key: "shopping",
      rows: [
        { key: "orders", href: "/account/orders", value: "" },
        {
          key: "wishlist",
          href: "/account/wishlist",
          value: t("rows.items", { count: wishlist?.total ?? 0 }),
        },
        {
          key: "wallet",
          href: "/account/wallet",
          value: formatPrice(wallet?.balance ?? 0, wallet?.currency ?? "SAR"),
        },
      ],
    },
    {
      key: "general",
      rows: [
        {
          key: "notifications",
          href: "/account/settings/profile#notifications",
          value: channels.map((each) => t(`channels.${each}`)).join(", "),
        },
        { key: "contact", href: "/help/contact", value: "" },
        { key: "faqs", href: "/help", value: "" },
        { key: "about", href: "/about", value: "" },
      ],
    },
  ] as const;

  const avatar = resolveMediaUrl(user?.profilePic ?? null);
  const initials = (user?.fullName ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="settings" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* profile card — 651:9539 */}
            <section className="bg-base border-line flex flex-wrap items-center gap-4 rounded-12 border p-4">
              <span className="bg-action-tint text-action flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img src={avatar} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold" dir="auto">
                  {user?.fullName}
                </span>
                <span className="text-ink-secondary truncate text-[12px]">
                  {user?.email}
                </span>
              </span>
              <Link
                href="/account/settings/profile"
                className="border-line flex h-9 shrink-0 items-center rounded-8 border px-4 text-[12px] font-medium"
              >
                {t("editProfile")}
              </Link>
            </section>

            {groups.map((group) => (
              <section
                key={group.key}
                className="bg-base border-line flex flex-col rounded-12 border"
              >
                <h2 className="text-ink-tertiary px-4 pt-4 pb-2 text-[11px] font-medium tracking-wide uppercase">
                  {t(`groups.${group.key}`)}
                </h2>
                {group.rows.map((row, index) => (
                  <Link
                    key={row.key}
                    href={row.href}
                    className={`flex items-center gap-3 px-4 py-3.5 text-[13px] ${
                      index < group.rows.length - 1
                        ? "border-line-subtle border-b"
                        : ""
                    }`}
                  >
                    <span className="flex-1">{t(`rows.${row.key}`)}</span>
                    {row.value && (
                      <span className="text-ink-tertiary text-[12px]">
                        {row.value}
                      </span>
                    )}
                    <ChevronRight
                      className="text-ink-tertiary size-4 rtl:rotate-180"
                      aria-hidden
                    />
                  </Link>
                ))}
              </section>
            ))}

            {/* APPEARANCE — 651:9539's toggle row */}
            <section className="bg-base border-line flex flex-col rounded-12 border">
              <h2 className="text-ink-tertiary px-4 pt-4 pb-2 text-[11px] font-medium tracking-wide uppercase">
                {t("groups.appearance")}
              </h2>
              <ThemeToggleRow label={t("rows.lightMode")} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

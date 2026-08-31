import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAddresses, getPaymentMethods } from "@/lib/api/endpoints/checkout";
import { getWallet } from "@/lib/api/endpoints/wallet";
import { getWishlist } from "@/lib/api/endpoints/wishlist";
import { getNotificationPreferences } from "@/lib/api/endpoints/settings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { ThemeToggleRow } from "@/features/settings/components/theme-toggle-row";
import { signOutAction } from "@/features/auth/sign-out";

/**
 * Settings — Figma `651:9539` (Web_Settings, the index): a profile card, then
 * grouped rows whose trailing text is the current value.
 *
 * Every row's value is read rather than written in: "2 saved" is the address
 * count, "Visa ••4242" the default card, "Push, Email" the channels actually
 * enabled. A row with nothing behind it would be worse than no row.
 *
 * One frame row is omitted, recorded in plans/09 C37: **Premium Mode**, which
 * has no subscription endpoint of any kind.
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

  const [user, addresses, cards, wallet, wishlist, prefs, holiday] =
    await Promise.all([
      getCurrentUser(),
      getAddresses().catch(() => []),
      getPaymentMethods().catch(() => []),
      getWallet().catch(() => null),
      getWishlist().catch(() => null),
      getNotificationPreferences().catch(() => null),
      /* WEB_03_VacationMode's state, so the row can say On or Off. */
      serverApiFetch<{ holidayMode?: boolean | null }>(
        "/users/me/holiday-mode",
        { cache: "no-store" },
      ).catch(() => null),
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
          key: "vacation",
          href: "/account/settings/vacation",
          value: holiday?.holidayMode ? t("rows.on") : t("rows.off"),
        },
        {
          key: "referrals",
          href: "/account/referrals",
          value: "",
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
        {
          key: "language",
          href: "/account/settings",
          locale: locale === "ar" ? "en" : "ar",
          value: t(`languages.${locale}`),
        },
        { key: "contact", href: "/help/contact", value: "" },
        { key: "faqs", href: "/help", value: "" },
        { key: "about", href: "/about", value: "" },
        // No standalone privacy route; the footer already sends this to /about.
        { key: "privacy", href: "/about", value: "" },
      ],
    },
  ] as const;

  /*
    The frame's "Complete your profile" bar sits at 70%. There is no
    completeness figure on the API, so it counts the optional fields the
    profile form actually writes. `profileCompleted` hides it outright.
  */
  const optional = [
    user?.username,
    user?.email,
    user?.phoneNumber,
    user?.profilePic,
    user?.dob,
    user?.gender,
    user?.city,
    user?.country,
  ];
  const filled = optional.filter(Boolean).length;
  const percent = Math.round((filled / optional.length) * 100);
  const showProgress = Boolean(user) && !user?.profileCompleted;

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
            {/* ProfileCard — 651:9568 */}
            <section className="bg-base border-line-200 flex flex-wrap items-center gap-4 rounded-16 border p-5">
              <span className="bg-action-tint text-action flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[32px] text-[20px] font-bold">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img src={avatar} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className="text-ink-900 truncate text-[16px] font-semibold"
                  dir="auto"
                >
                  {user?.fullName}
                </span>
                <span className="text-ink-500 truncate text-[13px]">
                  {user?.email}
                </span>
                {showProgress && (
                  /* PR — 651:9574 */
                  <span className="flex flex-col gap-1 pt-0.5">
                    <span className="text-action text-[11px] font-medium">
                      {t("completeProfile")}
                    </span>
                    <span
                      className="bg-line-200 block h-1 w-[200px] overflow-hidden rounded-[2px]"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("completeProfile")}
                    >
                      <span
                        className="bg-accent-aqua block h-1 rounded-[2px]"
                        style={{ width: percent + "%" }}
                      />
                    </span>
                  </span>
                )}
              </span>
              <Link
                href="/account/settings/profile"
                className="border-line-200 text-ink-700 flex h-9 shrink-0 items-center rounded-8 border px-4 text-[12px] font-medium"
              >
                {t("editProfile")}
              </Link>
            </section>

            {groups.map((group) => (
              /* AccountCard / ShopCard / GenCard — 651:9581 */
              <section
                key={group.key}
                className="bg-base border-line-200 flex flex-col rounded-12 border"
              >
                <h2 className="text-ink-400 px-4 pt-5 pb-2 text-[10px] font-bold tracking-[0.8px] uppercase">
                  {t(`groups.${group.key}`)}
                </h2>
                {group.rows.map((row) => (
                  <Link
                    key={row.key}
                    href={row.href}
                    locale={"locale" in row ? row.locale : undefined}
                    className="border-fill-100 flex items-center gap-2 border-b px-4 py-3.5 text-[13px]"
                  >
                    <span className="text-ink-900 flex-1">
                      {t(`rows.${row.key}`)}
                    </span>
                    {row.value && (
                      <span className="text-ink-400 text-[12px]">
                        {row.value}
                      </span>
                    )}
                    <ChevronRight
                      className="text-ink-400 size-3.5 rtl:rotate-180"
                      aria-hidden
                    />
                  </Link>
                ))}
              </section>
            ))}

            {/*
              Security — 651:9730, from the third Web_Settings frame
              (`651:9687`). Only one of its three controls exists: there is no
              2FA endpoint and no biometric one, and no signed-in password
              change either, so Change password runs the forgot-password flow,
              which is the one that works. See plans/09 C61.
            */}
            <section className="bg-base border-line-200 flex flex-col rounded-12 border">
              <h2 className="text-ink-400 px-4 pt-5 pb-2 text-[10px] font-bold tracking-[0.8px] uppercase">
                {t("groups.security")}
              </h2>
              <Link
                href="/forgot-password"
                className="border-fill-100 flex items-center gap-2 border-b px-4 py-3.5 text-[13px]"
              >
                <span className="text-ink-900 flex-1">
                  {t("rows.changePassword")}
                </span>
                <ChevronRight
                  className="text-ink-400 size-3.5 rtl:rotate-180"
                  aria-hidden
                />
              </Link>
            </section>

            {/* AppCard — 651:9666 */}
            <section className="bg-base border-line-200 flex flex-col rounded-12 border">
              <h2 className="text-ink-400 px-4 pt-5 pb-2 text-[10px] font-bold tracking-[0.8px] uppercase">
                {t("groups.appearance")}
              </h2>
              <ThemeToggleRow label={t("rows.lightMode")} />
            </section>

            {/* LogoutCard — 651:9683 */}
            <form
              action={signOutAction}
              className="bg-base border-line-200 rounded-12 border"
            >
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-error flex w-full items-center gap-2.5 px-4 py-3.5 text-start text-[13px] font-medium"
              >
                <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
                {t("logout")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

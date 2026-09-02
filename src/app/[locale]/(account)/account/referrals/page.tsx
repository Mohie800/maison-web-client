import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gift, Share2, Users } from "lucide-react";
import { serverApiFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/current-user";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { CopyCode } from "@/features/settings/components/copy-code";

/**
 * WEB_04_ReferAFriend — `656:87`.
 *
 * `GET /referrals/me` carries the whole screen: the code, a ready-made share
 * message, and the stats behind both counters.
 *
 * **The reward currency is the API's, not ours.** It answered `currency: "AED"`
 * against a SAR-only platform; GAP-98 relabelled it and the endpoint says `SAR`
 * now, in the stats, in the `shareMessage` and in the spec. Nothing here
 * changed for it: the amounts have always rendered in whatever the endpoint
 * says, which is why the fix needed no client work (plans/09 C60).
 */
export const metadata: Metadata = { robots: { index: false } };

interface ReferralSummary {
  referralCode?: string | null;
  shareMessage?: string | null;
  stats?: {
    totalReferrals?: number | null;
    pendingReferrals?: number | null;
    completedReferrals?: number | null;
    totalEarned?: number | null;
    currency?: string | null;
    rewardAmount?: number | null;
  } | null;
}

const STEPS = [
  { key: "tell", icon: Users },
  { key: "signUp", icon: Share2 },
  { key: "earn", icon: Gift },
] as const;

export default async function ReferralsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/account/referrals");

  const t = await getTranslations("Referrals");
  const data = await serverApiFetch<ReferralSummary>("/referrals/me", {
    cache: "no-store",
  }).catch(() => null);

  const stats = data?.stats ?? null;
  const currency = stats?.currency ?? "SAR";
  const reward = formatPrice(stats?.rewardAmount ?? 0, currency);

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountSidebar active="referrals" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Header — 656:161 */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-ink text-[28px] font-bold">{t("title")}</h1>
              <p className="text-ink-secondary text-[15px]">{t("subtitle")}</p>
            </div>

            {/* Top — 656:164 */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
              {/* Hero — 656:165 */}
              <div className="bg-ink-900 flex min-w-0 flex-1 flex-col gap-3 rounded-16 p-8">
                <span className="bg-base text-action flex size-13 items-center justify-center rounded-16">
                  <Gift className="size-7" aria-hidden />
                </span>
                <span className="text-base text-[11px] font-bold tracking-[0.88px] uppercase">
                  {t("heroKicker")}
                </span>
                <span className="text-base text-[24px] font-bold">
                  {t("heroTitle", { amount: reward })}
                </span>
                <span className="text-base/relaxed text-[14px] opacity-75">
                  {t("heroBody", { amount: reward })}
                </span>
              </div>

              {/* Stats — 656:175 */}
              <div className="flex shrink-0 flex-col gap-4 lg:w-[280px]">
                <Stat
                  value={formatPrice(stats?.totalEarned ?? 0, currency)}
                  label={t("creditsToSpend")}
                />
                <Stat
                  value={String(stats?.completedReferrals ?? 0)}
                  label={t("friendsJoined")}
                />
              </div>
            </div>

            {/* HowItWorks — 656:182 */}
            <div className="bg-base border-line-200 flex flex-col gap-5 rounded-16 border p-7">
              <div className="flex flex-col items-center gap-1 text-center">
                <h2 className="text-ink text-[22px] font-bold">
                  {t("howTitle")}
                </h2>
                <p className="text-ink-secondary text-[13px]">
                  {t("howBody")}
                </p>
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {STEPS.map(({ key, icon: Icon }) => (
                  <div
                    key={key}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2.5"
                  >
                    <span className="bg-action-tint text-action flex size-12 items-center justify-center rounded-12">
                      <Icon className="size-7" aria-hidden />
                    </span>
                    <span className="text-ink text-center text-[14px] font-bold">
                      {t(`steps.${key}.title`)}
                    </span>
                    <span className="text-ink-secondary text-center text-[12px] leading-[17px]">
                      {t(`steps.${key}.body`, { amount: reward })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CodeCta — 656:213 */}
            <div className="bg-tint flex flex-col gap-6 rounded-16 p-7 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-ink-secondary text-[13px] font-semibold">
                  {t("yourCode")}
                </span>
                <CopyCode
                  code={data?.referralCode ?? ""}
                  shareMessage={data?.shareMessage ?? null}
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                  shareLabel={t("makeReferral")}
                  noCodeLabel={t("noCode")}
                />
                <span className="text-ink-tertiary text-[11px] opacity-90">
                  {t("footnote")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-base border-line-200 flex flex-col items-center gap-1 rounded-12 border p-5">
      <span className="text-ink text-[28px] font-bold" dir="ltr">
        {value}
      </span>
      <span className="text-ink-tertiary text-[11px] font-semibold uppercase">
        {label}
      </span>
    </div>
  );
}

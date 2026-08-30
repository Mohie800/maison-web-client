import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { platformFee } from "@/lib/config/fees";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import { formatPrice } from "@/lib/format/money";

/**
 * Pricing — Figma `651:16072` (Web_Pricing).
 *
 * ⚠️ **The frame's headline number is wrong.** It shows 1% — in the hero, the
 * 80px figure, the checklist and the worked example (SAR 1,000 → SAR 10 → SAR
 * 990). The API charges 15%: that same sale pays out SAR 850, and the wallet's
 * payout row proves it.
 *
 * Every number on this page therefore comes from `GET /settings/fees`, so the
 * page is internally consistent and matches what a seller is actually charged.
 * The layout is the frame's, unchanged. Raised with design as plans/09 C18.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const [t, fees] = await Promise.all([
    getTranslations({ locale, namespace: "Pricing" }),
    getPlatformFees(),
  ]);
  return {
    title: t("title"),
    description: t("subtitle", { percent: fees.platformFeePercent }),
  };
}

const POINTS = ["free", "onSale", "payout", "noSubscription", "included"] as const;

/** The frame's worked example, at the real rate. */
const EXAMPLE_AMOUNT = 1000;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, fees] = await Promise.all([
    getTranslations("Pricing"),
    getPlatformFees(),
  ]);
  const percent = fees.platformFeePercent;

  const fee = platformFee(EXAMPLE_AMOUNT, percent);
  const earnings = EXAMPLE_AMOUNT - fee;
  const money = (n: number) => formatPrice(n, "SAR");

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:16073 */}
      <div className="bg-ink-900 flex h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base text-[36px] font-bold">{t("title")}</h1>
        <p className="text-ink-500 text-[16px]">
          {t("subtitle", { percent })}
        </p>
      </div>

      {/* Sec — 651:16076 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 py-16 lg:px-20">
        {/* FeeCard — 651:16077 */}
        <div className="bg-action-tint border-action flex w-full max-w-[680px] flex-col items-center gap-4 rounded-20 border p-8 sm:p-12">
          <p className="text-action text-center text-[80px] leading-none font-bold">
            {percent}%
          </p>
          <p className="text-ink-500 text-center text-[18px]">{t("feeCaption")}</p>

          <span className="bg-line-200 h-px w-full" aria-hidden />

          <ul className="flex w-full flex-col gap-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span className="bg-action text-base flex size-[22px] shrink-0 items-center justify-center rounded-full">
                  <Check className="size-2.5" aria-hidden />
                </span>
                <span className="text-[14px]">{t(`points.${point}`)}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/sell"
            className="bg-action text-base flex h-[52px] items-center justify-center rounded-[26px] px-10 text-[15px] font-bold"
          >
            {t("startFree")}
          </Link>
        </div>

        {/* CalcCard — 651:16104 */}
        <div className="bg-base border-line flex w-full max-w-[680px] flex-col gap-4 rounded-16 border p-7">
          <h2 className="text-[16px] font-semibold">{t("exampleTitle")}</h2>

          <div className="flex items-start justify-between py-1 text-[14px]">
            <span className="text-ink-500">{t("exampleListed")}</span>
            <span className="font-bold" dir="ltr">
              {money(EXAMPLE_AMOUNT)}
            </span>
          </div>

          <div className="flex items-start justify-between py-1 text-[14px]">
            <span className="text-ink-500">
              {t("exampleFee", { percent })}
            </span>
            <span className="font-bold" dir="ltr">
              − {money(fee)}
            </span>
          </div>

          <div className="flex items-start justify-between py-1 text-[14px] font-bold">
            <span>{t("exampleEarnings")}</span>
            <span className="text-action" dir="ltr">
              {money(earnings)}
            </span>
          </div>

          <span className="bg-line-200 h-px w-full" aria-hidden />
        </div>
      </div>
    </div>
  );
}

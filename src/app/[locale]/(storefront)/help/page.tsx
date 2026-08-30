import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { HelpShell } from "@/features/help/components/help-shell";
import { getPlatformFees } from "@/lib/api/endpoints/settings";

/**
 * Help Center — FAQ, Figma `651:16266` (Web_HelpCenter_FAQ).
 *
 * Each question is a native `<details>`: the frame draws a chevron and an open
 * answer, and disclosure is the one interaction the browser already does
 * without JavaScript.
 *
 * The frame's six answers are the design's copy, kept verbatim except where
 * they contradicted the product — the fee in the payment answer comes from
 * `GET /settings/fees`, and the accepted methods are the seven the API's
 * `PAYMENT_METHOD_TYPES` actually accepts.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Help" });
  return { title: t("faqTitle"), description: t("subtitle") };
}

const QUESTIONS = [
  "authentic",
  "wrongItem",
  "trade",
  "cancel",
  "shipping",
  "payment",
] as const;

export default async function HelpFaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, fees] = await Promise.all([
    getTranslations("Help"),
    getPlatformFees(),
  ]);

  return (
    <HelpShell active="faq">
      <h1 className="text-[22px] font-bold">{t("faqTitle")}</h1>

      {QUESTIONS.map((key) => (
        <details
          key={key}
          className="bg-base border-line group rounded-12 border px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <span className="text-[14px] font-semibold">
              {t(`faq.${key}.q`)}
            </span>
            <ChevronDown
              className="text-ink-400 size-3.5 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="text-ink-500 mt-2 text-[13px]">
            {t(`faq.${key}.a`, { percent: fees.platformFeePercent })}
          </p>
        </details>
      ))}
    </HelpShell>
  );
}

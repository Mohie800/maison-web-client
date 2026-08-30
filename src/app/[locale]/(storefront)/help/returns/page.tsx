import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpShell } from "@/features/help/components/help-shell";

/**
 * Help Center — Returns Policy, Figma `651:8651` (Web_HelpCenter_Returns).
 *
 * Five policy cards, the design's copy verbatim. Nothing here is computed: it's
 * the platform's policy, not the API's data.
 *
 * The last card describes the flow — My Orders → Request Return — which isn't
 * built yet (plans/09 C15). The copy is accurate about the intended path, so it
 * stays; the route it describes is build work rather than a contradiction.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Help" });
  return { title: t("returnsTitle"), description: t("subtitle") };
}

const CARDS = ["window", "eligible", "notEligible", "refund", "howTo"] as const;

export default async function HelpReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Help");

  return (
    <HelpShell active="returns">
      <h1 className="text-[22px] font-bold">{t("returnsTitle")}</h1>

      {CARDS.map((card) => (
        <section
          key={card}
          className="bg-base border-line flex flex-col gap-2.5 rounded-12 border p-5"
        >
          <h2 className="text-[15px] font-semibold">{t(`returns.${card}.title`)}</h2>
          <p className="text-ink-500 text-[13px]">{t(`returns.${card}.body`)}</p>
        </section>
      ))}
    </HelpShell>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpShell } from "@/features/help/components/help-shell";

/**
 * Help Center — Payment Info. Figma `651:8155` (Web_HelpCenter_Payment).
 *
 * The six methods are the frame's, and five map exactly onto
 * `NewPaymentMethodDto.type` (`mada`, `stc_pay`, `tabby`, `tamara`, `paytabs`);
 * "Visa / MC" is the enum's `card`. The API also accepts `apple_pay`, which the
 * frame does not draw — the list is the design's, so it is left out and
 * recorded in plans/09 C47.
 */
export const metadata: Metadata = {
  title: "Payment Info",
};

/** PM — 651:8186. */
const METHODS = [
  { key: "mada", tone: "bg-info-tint text-info" },
  { key: "stcPay", tone: "bg-action-tint text-action" },
  { key: "tabby", tone: "bg-warn-tint text-amber-deep" },
  { key: "tamara", tone: "bg-purple-tint text-purple-text" },
  { key: "payTabs", tone: "bg-fill-100 text-ink-700" },
  { key: "cards", tone: "bg-fill-100 text-ink-700" },
] as const;

export default async function HelpPaymentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Help");

  return (
    <HelpShell active="payment">
      {/* PayContent — 651:8183 */}
      <div className="flex w-full flex-col items-start gap-6">
        <h1 className="text-ink-900 text-[22px] font-bold">
          {t("payment.title")}
        </h1>

        {/* PMRow — 651:8185 */}
        <div className="flex w-full flex-wrap items-start gap-6">
          {METHODS.map(({ key, tone }) => (
            <div
              key={key}
              className={`flex flex-col items-start gap-1 rounded-12 p-4 ${tone}`}
            >
              <span className="text-[14px] font-bold">
                {t(`payment.methods.${key}.name`)}
              </span>
              <span className="text-[11px]">
                {t(`payment.methods.${key}.note`)}
              </span>
            </div>
          ))}
        </div>

        {/* SecCard — 651:8204 */}
        <div className="bg-action-tint flex w-full flex-col items-start gap-2.5 rounded-12 p-5">
          <h2 className="text-action text-[15px] font-semibold">
            {t("payment.securityTitle")}
          </h2>
          <p className="text-ink-700 text-[13px]">{t("payment.securityBody")}</p>
        </div>
      </div>
    </HelpShell>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPlatformFees } from "@/lib/api/endpoints/settings";

/**
 * Seller Guide — Figma `651:16116` (Web_SellerGuide).
 *
 * The frame's sidebar lists eight topics but only writes five of them; the
 * other three (Shipping Guide, Seller Protection, FAQs) have no section in the
 * design, so there is nothing to anchor to. Those are back with design rather
 * than linked to empty space (plans/09 C19).
 *
 * Two lines of the frame's copy contradict the product and are corrected here:
 * the fee comes from `GET /settings/fees`, not the frame's 1%, and payouts are
 * credited to the
 * wallet when the buyer's delivery is confirmed — not batched fortnightly. Both
 * were verified against a real order on 2026-08-28 (plans/09 C18).
 *
 * The sidebar's active state is the frame's, on the first topic: without
 * client-side scroll-spy the page can't know which section you're reading, and
 * a static page shouldn't need JavaScript to render its own contents list.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "SellerGuide" });
  return { title: t("title"), description: t("subtitle") };
}

const TOPICS = [
  "gettingStarted",
  "listing",
  "photos",
  "pricingTips",
  "gettingPaid",
] as const;

export default async function SellerGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, fees] = await Promise.all([
    getTranslations("SellerGuide"),
    getPlatformFees(),
  ]);

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:16117 */}
      <div className="bg-ink-900 flex h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base text-[36px] font-bold">{t("title")}</h1>
        <p className="text-ink-500 text-[16px]">{t("subtitle")}</p>
      </div>

      {/* Sec — 651:16120 */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-16 lg:px-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* SGNav — 651:16122 */}
          <nav
            aria-label={t("contents")}
            className="bg-base border-line w-full shrink-0 overflow-hidden rounded-[14px] border py-5 lg:sticky lg:top-24 lg:w-[220px]"
          >
            <ul className="flex flex-col">
              {TOPICS.map((topic, index) => (
                <li key={topic}>
                  <a
                    href={`#${topic}`}
                    className={`flex px-4 py-2.5 text-[13px] ${
                      index === 0
                        ? "bg-action-tint text-action font-semibold"
                        : "text-ink-500 hover:bg-tint"
                    }`}
                  >
                    {t(`topics.${topic}.title`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* SGContent — 651:16139 */}
          <div className="divide-line flex min-w-0 flex-1 flex-col divide-y">
            {TOPICS.map((topic, index) => (
              <section
                key={topic}
                id={topic}
                className={`flex scroll-mt-24 flex-col gap-3 ${index === 0 ? "pb-8" : "py-8"}`}
              >
                {/* SH3 — 651:16141 */}
                <div className="flex items-center gap-3">
                  <span className="bg-action size-2 shrink-0 rounded-[4px]" aria-hidden />
                  <h2 className="text-[18px] font-semibold">
                    {t(`topics.${topic}.title`)}
                  </h2>
                </div>
                <p className="text-ink-500 text-[14px]">
                  {t(`topics.${topic}.body`, { percent: fees.platformFeePercent })}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

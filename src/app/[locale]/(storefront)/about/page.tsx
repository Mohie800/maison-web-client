import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import { getListings } from "@/lib/api/endpoints/listings";
import { formatCount } from "@/lib/format/money";
import type { Locale } from "@/i18n/routing";

/**
 * About Maison Sale — Figma `651:16170` (Web_AboutUs).
 *
 * The frame's stat band is marketing placeholder — "50K+ Listed Items", "10K+
 * Verified Sellers", "8 Saudi Cities", "1% Platform Fee". Three of those we can
 * measure and two we can't, so the band renders the measured ones rather than
 * the copy: a marketplace page claiming fifty thousand items while holding
 * forty-two is a screenshot waiting to happen.
 *
 * **The fee is the important one.** The design says 1%; the rate the API
 * actually charges comes from `GET /settings/fees`. We show the real one — a
 * wrong fee on a public page is the kind of thing people quote back at you —
 * and it's raised with design (plans/09 C18).
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), description: t("subtitle") };
}

/** Value cards — Figma `651:16204` and siblings, in the frame's order. */
const VALUE_TONES = [
  "bg-action-tint",
  "bg-action-tint",
  "bg-info-tint",
  "bg-purple-tint",
];
const VALUES = ["trust", "fair", "authenticity", "community"] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("About");
  const activeLocale = (await getLocale()) as Locale;

  const [listings, categories, fees] = await Promise.all([
    getListings({ limit: 1 }),
    getCategoryTree(),
    getPlatformFees(),
  ]);

  const listed = formatCount(listings.total, activeLocale);

  const stats = [
    { key: "listed", value: listed },
    { key: "categories", value: String(categories.length) },
    { key: "fee", value: `${fees.platformFeePercent}%` },
  ];

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:16171 */}
      <div className="bg-ink-900 flex h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base text-[36px] font-bold">{t("title")}</h1>
        <p className="text-ink-500 text-[16px]">{t("subtitle")}</p>
      </div>

      {/* Sec — Our Mission — 651:16174 */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-16 lg:px-20">
        <div className="flex flex-col items-center gap-[60px] lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
            <p className="text-action text-[14px] font-bold">{t("missionEyebrow")}</p>
            <p className="text-[20px]">{t("missionLead")}</p>
            <p className="text-ink-500 text-[16px]">{t("missionBody")}</p>
            <Link
              href="/sell"
              className="bg-action text-base flex h-12 items-center justify-center rounded-[24px] px-7 text-[14px] font-bold"
            >
              {t("startSelling")}
            </Link>
          </div>

          {/* AR2 — 651:16182 */}
          <div className="bg-action-tint flex h-[320px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-20 lg:w-[420px]">
            <p className="text-action text-[40px] font-bold">{listed}</p>
            <p className="text-ink-500 text-[14px]">{t("stats.listed")}</p>
          </div>
        </div>
      </div>

      {/* StatsS — 651:16185 */}
      <div className="bg-base">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 sm:flex-row lg:px-20">
          {stats.map((stat) => (
            <div
              key={stat.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <p className="text-action text-[28px] font-bold">{stat.value}</p>
              <p className="text-ink-500 text-[13px]">{t(`stats.${stat.key}`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sec — Our Values — 651:16201 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-16 lg:px-20">
        <h2 className="text-[24px] font-bold">{t("valuesTitle")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value, index) => (
            <div
              key={value}
              className={`flex flex-col gap-2.5 rounded-[14px] p-5 ${VALUE_TONES[index]}`}
            >
              <h3 className="text-[16px] font-bold">{t(`values.${value}.title`)}</h3>
              <p className="text-ink-500 text-[13px]">{t(`values.${value}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

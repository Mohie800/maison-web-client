import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getBundles } from "@/lib/api/endpoints/bundles";
import { BUNDLE_SORTS, isBundleSort } from "@/lib/api/schemas/bundle";
import { BundleCard } from "@/features/bundles/components/bundle-card";

/**
 * Bundles — Figma `651:4950` (Web_Bundles_All).
 *
 * The frame draws no sort control, but `GET /bundles` offers two orders and the
 * API documents `savings_desc` as powering the home rail. They are rendered as
 * a small pair of chips above the grid rather than left unreachable
 * (plans/09 C49).
 */
export const metadata: Metadata = {
  title: "Bundles",
};

export default async function BundlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Bundles");
  const query = await searchParams;
  const sort =
    typeof query.sort === "string" && isBundleSort(query.sort)
      ? query.sort
      : "newest";

  const result = await getBundles({ sort });

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-6 pb-14 lg:px-20">
        {/* breadcrumb — 651:4965 */}
        <nav className="text-ink-tertiary flex items-center gap-1.5 text-[12px]">
          <Link href="/" className="hover:text-ink">
            {t("home")}
          </Link>
          <ChevronRight className="size-3 rtl:rotate-180" aria-hidden />
          <span className="text-ink">{t("title")}</span>
        </nav>

        <h1 className="text-ink mt-4 text-[32px] font-bold">{t("title")}</h1>
        <p className="text-ink-secondary mt-1 text-[14px]">{t("subtitle")}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {BUNDLE_SORTS.map((key) => {
            const active = key === sort;
            return (
              <Link
                key={key}
                href={key === "newest" ? "/bundles" : `/bundles?sort=${key}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center justify-center rounded-[18px] px-4 text-[12px] font-semibold ${
                  active
                    ? "bg-aqua text-on-accent"
                    : "bg-base border-line text-ink border"
                }`}
              >
                {t(`sorts.${key}`)}
              </Link>
            );
          })}
        </div>

        {result.items.length === 0 ? (
          <p className="text-ink-secondary border-line mt-8 rounded-16 border border-dashed p-14 text-center text-[13px]">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                labels={{
                  view: t("view"),
                  unavailable: t("unavailable"),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { resolveMediaUrl } from "@/lib/api/media";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatCount } from "@/lib/format/money";
import type { Locale } from "@/i18n/routing";

/**
 * All Categories — Figma `651:2815` (Web_CategoriesOverview).
 *
 * One section per top-level category: a tinted panel with the category's photo,
 * name and count, then its children as cards. Everything is real — `imageUrl`
 * and the rolled-up `listingCount` both arrived with GAP-31, and the children
 * come from `GET /categories/tree`.
 *
 * The design draws four sections and the tree has nine, so the accent run
 * repeats. The counts are exact rather than the design's "12,500+": we know the
 * number, and rounding it up would be a decoration that lies.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Categories" });
  return { title: t("title"), description: t("subtitle") };
}

/** Band, name/count text, and Browse fill — Figma `651:2821` and siblings. */
const TONES = [
  { band: "bg-action-tint", text: "text-action", pill: "bg-aqua" },
  { band: "bg-info-tint", text: "text-info", pill: "bg-focus" },
  { band: "bg-warn-tint", text: "text-amber-text", pill: "bg-gold" },
  { band: "bg-purple-tint", text: "text-purple-text", pill: "bg-purple" },
];

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Categories");
  const activeLocale = (await getLocale()) as Locale;
  const categories = await getCategoryTree();

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:2816 */}
      <div className="bg-ink-900 flex h-[120px] flex-col items-center justify-center gap-1.5">
        <h1 className="text-base text-[28px] font-bold">{t("title")}</h1>
        <p className="text-ink-400 text-[14px]">{t("subtitle")}</p>
      </div>

      {/* Content — 651:2819 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-10 pb-16 lg:px-20">
        {categories.map((category, index) => {
          const tone = TONES[index % TONES.length];
          const image = resolveMediaUrl(category.imageUrl ?? category.iconUrl);
          const children = category.children ?? [];

          return (
            <section
              key={category.id}
              className="bg-base border-line flex flex-col overflow-hidden rounded-16 border lg:flex-row lg:items-stretch"
            >
              {/* Left — 651:2821 */}
              <div
                className={`flex shrink-0 flex-col items-center justify-center gap-3 px-6 py-8 lg:w-[260px] ${tone.band}`}
              >
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={image}
                    alt=""
                    className="h-[155px] w-full rounded-12 object-cover"
                    loading="lazy"
                  />
                )}
                <p className={`text-[16px] font-bold ${tone.text}`} dir="auto">
                  {pickLocalized(category, "name", activeLocale)}
                </p>
                {category.listingCount != null && (
                  <p className={`text-[12px] ${tone.text}`}>
                    {t("itemsCount", {
                      count: formatCount(category.listingCount, activeLocale),
                    })}
                  </p>
                )}
                <Link
                  href={`/products?categoryId=${category.id}`}
                  className={`flex h-[38px] w-full items-center justify-center rounded-[19px] px-5 text-[13px] font-bold text-black ${tone.pill}`}
                >
                  {t("browseAll")}
                </Link>
              </div>

              {/* Right — 651:2827 */}
              <div className="flex flex-1 flex-wrap content-start gap-6 p-6">
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/products?categoryId=${child.id}`}
                    className="bg-fill-50 border-line flex w-full items-center justify-between rounded-10 border px-3.5 py-3 sm:w-[calc(50%-12px)] xl:w-[308px]"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className="text-ink-900 truncate text-[13px] font-medium"
                        dir="auto"
                      >
                        {pickLocalized(child, "name", activeLocale)}
                      </span>
                      {child.listingCount != null && (
                        <span className="text-ink-400 text-[11px]">
                          {t("itemsCount", {
                            count: formatCount(child.listingCount, activeLocale),
                          })}
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 text-[12px] ${tone.text}`} aria-hidden>
                      &gt;
                    </span>
                  </Link>
                ))}

                {children.length === 0 && (
                  <p className="text-ink-400 text-[13px]">{t("noSubcategories")}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

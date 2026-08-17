import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { pickLocalized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/routing";

/**
 * Category strip below the header — Figma node 651:824.
 *
 * Top-level categories on the leading side; Auctions / Trade / Trend Hub on the
 * trailing side. Categories come from the live tree rather than a hardcoded
 * list, so adding one in the admin surfaces here without a deploy.
 */
export async function SubNav() {
  const t = await getTranslations("Chrome");
  const tNav = await getTranslations("Nav");
  const locale = (await getLocale()) as Locale;
  const categories = await getCategoryTree();

  return (
    <nav className="bg-base border-line hidden h-12 border-b lg:block">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-6 px-20">
        <Link href="/products" className="text-label text-ink font-semibold">
          {t("all")}
        </Link>

        {categories.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={`/products?categoryId=${category.id}`}
            className="text-label text-ink-secondary hover:text-ink whitespace-nowrap"
          >
            {pickLocalized(category, "name", locale)}
          </Link>
        ))}

        <div className="flex-1" />

        <Link
          href="/auctions"
          className="text-label text-error flex items-center gap-1.5 font-semibold"
        >
          {tNav("auctions")}
          <span className="bg-error text-[9px] font-bold uppercase text-white rounded-[6px] px-1.5 py-0.5">
            {t("live")}
          </span>
        </Link>
        <Link href="/trade" className="text-label text-purple font-semibold">
          {tNav("trade")}
        </Link>
        <Link href="/trends" className="text-label text-gold font-semibold">
          {t("trendHub")}
        </Link>
      </div>
    </nav>
  );
}

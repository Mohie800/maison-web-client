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
 *
 * Padding is on each tab, not the row, so the whole 48px height is clickable —
 * which is also how the frame builds it. The outer 66px keeps the first label
 * on the 80px page margin.
 */
export async function SubNav() {
  const t = await getTranslations("Chrome");
  const tNav = await getTranslations("Nav");
  const locale = (await getLocale()) as Locale;
  const categories = await getCategoryTree();

  return (
    <nav className="bg-base border-line-200 hidden h-12 border-b lg:block">
      <div className="mx-auto flex h-full max-w-[1440px] items-center px-[66px]">
        <Link
          href="/products"
          className="text-ink-900 flex h-full items-center px-3.5 text-[13px] font-semibold"
        >
          {t("all")}
        </Link>

        {categories.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={`/products?categoryId=${category.id}`}
            className="text-ink-500 hover:text-ink-900 flex h-full items-center px-3.5 text-[13px] whitespace-nowrap"
          >
            {pickLocalized(category, "name", locale)}
          </Link>
        ))}

        {/* Divider — 651:835 */}
        <span className="bg-line-200 h-6 w-px shrink-0" aria-hidden />

        <div className="flex-1" />

        <Link
          href="/auctions"
          className="text-error flex h-full items-center gap-1.5 px-3.5 text-[13px] font-semibold"
        >
          {tNav("auctions")}
          <span className="bg-error text-base flex h-[18px] items-center rounded-[9px] px-1.5 text-[8px] font-bold uppercase">
            {t("live")}
          </span>
        </Link>
        <Link
          href="/trade"
          className="text-purple flex h-full items-center px-3.5 text-[13px] font-semibold"
        >
          {tNav("trade")}
        </Link>
        <Link
          href="/trends"
          className="text-gold flex h-full items-center px-3.5 text-[13px] font-semibold"
        >
          {t("trendHub")}
        </Link>
      </div>
    </nav>
  );
}

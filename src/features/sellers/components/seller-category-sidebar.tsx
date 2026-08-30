import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import type { SellerCategoryRow } from "@/lib/api/schemas/seller";
import type { Locale } from "@/i18n/routing";

/**
 * Category sidebar — Figma `651:9088`.
 *
 * Top-level rows only. The rail returns both levels — a leaf carries `parent`
 * and its parent appears as its own row — so rendering the array as-is would
 * show one listing twice, as "Kids" and as "Boys". Filtering by a parent
 * includes its children server-side (GAP-37), which is what makes the
 * top-level row the right thing to link to.
 *
 * The split reads `isTopLevel` (GAP-51) and falls back to the absence of
 * `parent` for rows written before it.
 *
 * The design shows no counts here, so neither do we, even though the rail
 * carries them.
 */
export async function SellerCategorySidebar({
  categories,
  activeId,
  buildHref,
}: {
  categories: SellerCategoryRow[];
  activeId?: string;
  buildHref: (categoryId?: string) => string;
}) {
  const t = await getTranslations("Seller");
  const locale = (await getLocale()) as Locale;

  const roots = categories.filter((row) => row.isTopLevel ?? !row.parent);
  if (roots.length === 0) return null;

  const rows = [
    { id: undefined, label: t("allItems") },
    ...roots.map((row) => ({
      id: row.id,
      label: pickLocalized(row, "name", locale),
    })),
  ];

  return (
    <nav
      aria-label={t("categories")}
      className="bg-base border-line w-full shrink-0 overflow-hidden rounded-12 border py-4 lg:w-[220px]"
    >
      <ul className="flex flex-col">
        {rows.map((row) => {
          const active = row.id === activeId;
          return (
            <li key={row.id ?? "all"}>
              <Link
                href={buildHref(row.id)}
                aria-current={active ? "true" : undefined}
                className={`flex px-4 py-2.5 text-[13px] ${
                  active
                    ? "bg-action-tint text-action font-semibold"
                    : "text-ink-700 hover:bg-tint"
                }`}
                dir="auto"
              >
                {row.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

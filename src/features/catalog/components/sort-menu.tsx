import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildHref, SORT_OPTIONS, type PlpFilters } from "../filters";

/**
 * The sort dropdown — Figma `651:4035` on the PLP and `651:2712` on search.
 *
 * A `<details>`, so it needs no JavaScript. Shared because the two frames draw
 * the same control over the same filter model; two implementations of it would
 * drift within a sprint, which is the same reasoning that put the PLP's filter
 * panel on the search page (plans/09 C32).
 *
 * The frames disagree by 2px on the radius — `651:4035` is 10, `651:2712` is 8.
 * One control at 10 is worth more than two controls that agree with their own
 * frame and nothing else.
 */
export async function SortMenu({
  filters,
  basePath = "/products",
}: {
  filters: PlpFilters;
  basePath?: string;
}) {
  const t = await getTranslations("Catalog");
  const current =
    SORT_OPTIONS.find((o) => o.value === filters.sort) ?? SORT_OPTIONS[0];

  return (
    <details className="relative shrink-0">
      <summary className="bg-base border-line-200 flex h-[38px] cursor-pointer list-none items-center justify-center gap-2 rounded-10 border ps-3.5 pe-2.5">
        <span className="text-ink-900 text-[12px] font-medium">
          {t("sortValue", { value: t(`sortOptions.${current.labelKey}`) })}
        </span>
        <ChevronDown className="text-ink-500 size-3" aria-hidden />
      </summary>

      <div className="bg-base border-line-200 absolute end-0 z-20 mt-1 flex min-w-full flex-col overflow-hidden rounded-10 border shadow-lg">
        {SORT_OPTIONS.map((option) => {
          const active = filters.sort === option.value;
          return (
            <Link
              key={option.value}
              href={buildHref(filters, { sort: option.value }, basePath)}
              aria-current={active ? "true" : undefined}
              className={`px-3.5 py-2 text-[12px] whitespace-nowrap ${
                active
                  ? "bg-action-tint text-action font-semibold"
                  : "text-ink-700 hover:bg-surface"
              }`}
            >
              {t(`sortOptions.${option.labelKey}`)}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

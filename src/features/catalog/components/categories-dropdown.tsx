"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { CategoryType } from "@/features/sell/draft";

/**
 * Web_CategoriesDropdown — `651:2972`, opened from the header's Categories link.
 *
 * Four tabs across the top, each a coloured dot and a type name, then that
 * type's top-level categories as columns of their children, then a bar with the
 * type's rolled-up item count and a View All pill.
 *
 * **The frame's three levels are the API's two.** It draws type → column group →
 * leaf; the tree is two deep and has nine roots, none of which carries a type
 * (GAP-75). So the four tabs are the same client-side grouping the sell wizard
 * uses, each root becomes a column, and its children are the rows — which lands
 * on the same shape without inventing a level (plans/09 C58).
 */

export interface DropdownCategory {
  id: string;
  name: string;
  listingCount: number | null;
  type: CategoryType;
  children: { id: string; name: string }[];
}

const TYPES: CategoryType[] = [
  "fashion",
  "electronics",
  "furniture",
  "toys_art",
];

/** The frame's dot per tab — `651:2975` and siblings. */
const DOT: Record<CategoryType, string> = {
  fashion: "bg-aqua",
  electronics: "bg-focus",
  furniture: "bg-gold",
  toys_art: "bg-purple",
};

export function CategoriesDropdown({
  categories,
  labels,
}: {
  categories: DropdownCategory[];
  labels: {
    trigger: string;
    types: Record<CategoryType, string>;
    viewAll: string;
    browse: string;
    browseAll: string;
    viewAllType: string;
  };
}) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CategoryType>("fashion");

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const columns = categories.filter((row) => row.type === type);
  const total = columns.reduce((sum, row) => sum + (row.listingCount ?? 0), 0);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-ink-500 text-[14px]"
      >
        {labels.trigger}
      </button>

      {open && (
        <div className="bg-base border-line-200 absolute start-0 top-9 z-50 flex w-[1200px] max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-16 border shadow-lg">
          {/* TopRow — 651:2973 */}
          <div className="border-fill-100 flex h-14 items-center border-b">
            {TYPES.map((key) => (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setType(key)}
                onFocus={() => setType(key)}
                onClick={() => setType(key)}
                className={`flex h-14 flex-1 items-center justify-center gap-2 text-[14px] ${
                  type === key
                    ? "bg-fill-50 text-ink-900 font-semibold"
                    : "text-ink-500"
                }`}
              >
                <span
                  className={`size-2.5 rounded-[5px] ${DOT[key]}`}
                  aria-hidden
                />
                {labels.types[key]}
              </button>
            ))}
          </div>

          {/* Content — 651:2986 */}
          <div className="flex items-start py-6">
            {columns.map((column, index) => (
              <div
                key={column.id}
                className={`flex w-[280px] flex-col items-start px-6 ${
                  index > 0 ? "border-fill-100 border-s" : ""
                }`}
              >
                {/* TRow — 651:2988 */}
                <div className="flex w-full items-center justify-between pb-3">
                  <span className="text-ink-900 text-[13px] font-bold">
                    {column.name}
                  </span>
                  <Link
                    href={`/products?categoryId=${column.id}`}
                    onClick={() => setOpen(false)}
                    className="text-action text-[11px] font-medium"
                  >
                    {labels.viewAll}
                  </Link>
                </div>

                {column.children.map((child) => (
                  /* Row — 651:2991 */
                  <Link
                    key={child.id}
                    href={`/products?categoryId=${child.id}`}
                    onClick={() => setOpen(false)}
                    className="text-ink-700 flex h-8 w-full items-center text-[13px]"
                  >
                    {child.name}
                  </Link>
                ))}

                {/* Browse — 651:3010 */}
                <Link
                  href={`/products?categoryId=${column.id}`}
                  onClick={() => setOpen(false)}
                  className="border-line-200 text-action mt-2 flex h-9 items-center justify-center rounded-8 border px-3 text-[12px] font-medium"
                >
                  {labels.browse.replace("{name}", column.name)}
                </Link>
              </div>
            ))}
          </div>

          {/* BottomBar — 651:3082 */}
          <div className="bg-fill-50 border-fill-100 flex items-center justify-between border-t px-6 py-3.5">
            <span className="text-ink-500 text-[13px]">
              {labels.browseAll
                .replace("{count}", String(total))
                .replace("{type}", labels.types[type])}
            </span>
            <Link
              href="/categories"
              onClick={() => setOpen(false)}
              className="bg-aqua flex h-9 items-center justify-center rounded-[18px] px-5 text-[13px] font-bold text-black"
            >
              {labels.viewAllType.replace("{type}", labels.types[type])}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, Package, Search } from "lucide-react";

export interface ClosetItem {
  id: string;
  title: string;
  price: string;
  category: string | null;
  photoUrl: string | null;
}

/**
 * Search field and "Your active listings" list — `651:6131`–`651:6190`.
 *
 * The frame draws radios, so one item per offer, even though
 * `offeredListingIds` is an array. The array takes a single id unchanged, so
 * multi-item offers stay open without a schema change.
 */
export function OfferPicker({
  items,
  name,
  searchPlaceholder,
  countLabel,
  emptyLabel,
}: {
  items: ClosetItem[];
  name: string;
  searchPlaceholder: string;
  countLabel: string;
  emptyLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(items[0]?.id ?? "");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.title.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <>
      {/* SearchField — 651:6131 */}
      <div className="bg-fill-50 border-line-200 flex h-11 w-full items-center gap-2 rounded-[22px] border px-3.5">
        <Search className="text-ink-400 size-4 shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>

      <p className="text-ink-500 text-[12px] font-medium">{countLabel}</p>

      {/* ListGrid — 651:6135 */}
      {visible.length === 0 ? (
        <p className="text-ink-500 border-line-200 w-full rounded-12 border border-dashed p-8 text-center text-[13px]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex w-full flex-col gap-2">
          {visible.map((item) => {
            const isSelected = item.id === selected;
            return (
              <li key={item.id}>
                <label
                  className={`flex w-full items-center gap-3 rounded-12 p-3 ${
                    isSelected
                      ? "bg-action-tint border-action border-[1.5px]"
                      : "bg-base border-line-200 border-[0.5px]"
                  }`}
                >
                  {/* IImg — 651:6137 */}
                  <span className="bg-fill-100 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-8">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="text-ink-400 size-5" aria-hidden />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                    <span
                      className={`w-full truncate text-[13px] font-semibold ${
                        isSelected ? "text-action" : "text-ink-900"
                      }`}
                      dir="auto"
                    >
                      {item.title}
                    </span>
                    <span className="flex items-start gap-2">
                      <span
                        className={`text-[12px] font-bold ${
                          isSelected ? "text-action" : "text-ink-900"
                        }`}
                        dir="ltr"
                      >
                        {item.price}
                      </span>
                      {item.category && (
                        <span
                          className={`flex h-[18px] items-center justify-center rounded-[9px] px-[7px] text-[9px] font-medium ${
                            isSelected
                              ? "bg-action-tint text-action"
                              : "bg-fill-100 text-ink-500"
                          }`}
                          dir="auto"
                        >
                          {item.category}
                        </span>
                      )}
                    </span>
                  </span>

                  {/* Radio — 651:6144 */}
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-10 border-[1.5px] ${
                      isSelected
                        ? "bg-action border-action"
                        : "bg-fill-100 border-line-200"
                    }`}
                    aria-hidden
                  >
                    {isSelected && (
                      <Check className="text-base size-3" strokeWidth={3} />
                    )}
                  </span>

                  <input
                    type="radio"
                    name={name}
                    value={item.id}
                    checked={isSelected}
                    onChange={() => setSelected(item.id)}
                    className="sr-only"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

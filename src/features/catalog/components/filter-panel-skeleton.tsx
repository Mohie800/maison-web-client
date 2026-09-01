import { Skeleton } from "@/components/ui/skeleton";

/**
 * Matches `FilterPanel`'s aside. Groups render closed, which is their default
 * state unless a filter is active — so this is the shape most visitors land on.
 * Below `lg` the real panel is collapsed behind a button, so the skeleton is a
 * single bar rather than the whole rail.
 */
export function FilterPanelSkeleton() {
  return (
    <aside className="w-full shrink-0 lg:w-[260px]">
      <Skeleton className="mb-3 h-11 w-full rounded-12 lg:hidden" />
      <div className="border-line bg-base divide-line divide-y overflow-hidden rounded-16 border max-lg:hidden">
        {/* One row per supported facet: category, condition, price, brand,
            sale mode, discount, material. */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="size-4 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </aside>
  );
}

import { ProductCardSkeleton } from "@/components/commerce/product-card-skeleton";
import { FilterPanelSkeleton } from "@/features/catalog/components/filter-panel-skeleton";
import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

const VISIBLE_CARDS = 9;

/**
 * Search results loading shell. Mirrors the layout in `page.tsx`.
 *
 * Deliberately free of data and i18n calls: this file is what the router
 * prefetches, so anything request-bound here would cost it that.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="bg-surface flex flex-col">
      {/* Search band — the real bar keeps its aqua border, so this holds it too */}
      <div className="bg-base border-line-200 border-b">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 lg:px-20">
          <div className="bg-fill-50 border-aqua flex h-14 items-center gap-3.5 rounded-[28px] border-2 px-5">
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-10 shrink-0 rounded-20" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-16 lg:flex-row lg:items-start lg:px-20">
        <FilterPanelSkeleton />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Results header — heading, count, sort */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-36 shrink-0 rounded-10" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: VISIBLE_CARDS }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

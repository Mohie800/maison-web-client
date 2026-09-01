import { ProductCardSkeleton } from "@/components/commerce/product-card-skeleton";
import { FilterPanelSkeleton } from "@/features/catalog/components/filter-panel-skeleton";
import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/** One screen's worth. PAGE_SIZE is 24, but nobody scrolls a skeleton. */
const VISIBLE_CARDS = 9;

/**
 * PLP loading shell. Mirrors the layout in `page.tsx` so nothing shifts on swap.
 *
 * Deliberately free of data and i18n calls: this file is what the router
 * prefetches, so anything request-bound here would cost it that.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="mt-6 flex flex-col gap-10 lg:flex-row">
        <FilterPanelSkeleton />

        <div className="min-w-0 flex-1">
          {/* Toolbar — title, count pill, sort */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-6 w-20 rounded-12" />
              </div>
              <Skeleton className="h-9 w-36 rounded-10" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: VISIBLE_CARDS }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

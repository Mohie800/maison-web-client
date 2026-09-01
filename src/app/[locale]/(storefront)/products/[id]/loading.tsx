import { ProductCardSkeleton } from "@/components/commerce/product-card-skeleton";
import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/**
 * PDP loading shell. Mirrors the grid in `page.tsx` so nothing shifts on swap.
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
        <Skeleton className="h-3 w-36" />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-16" />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-20 shrink-0 rounded-12" />
            ))}
          </div>
        </div>

        {/* Buy column */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-[22px] w-20 rounded-[6px]" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>

          {/* Title — two lines, the second short, as titles usually wrap */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-2/3" />
          </div>

          <Skeleton className="h-8 w-40" />

          {/* Seller strip */}
          <div className="border-line flex items-center gap-4 rounded-12 border p-4">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 rounded-[24px]" />
            <Skeleton className="h-12 rounded-[24px]" />
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-[30px] w-24 rounded-[14px]" />
            <Skeleton className="h-[30px] w-20 rounded-[14px]" />
            <Skeleton className="h-[30px] w-28 rounded-[14px]" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-14">
        <div className="border-line flex flex-wrap gap-1 border-b pb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ms-6 h-4 w-16" />
          <Skeleton className="ms-6 h-4 w-32" />
          <Skeleton className="ms-6 h-4 w-28" />
        </div>
        <div className="flex max-w-[760px] flex-col gap-3 pt-6">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>

      {/* You may also like */}
      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </SkeletonRoot>
  );
}

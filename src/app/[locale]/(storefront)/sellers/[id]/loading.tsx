import { ProductCardSkeleton } from "@/components/commerce/product-card-skeleton";
import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/** One screen's worth of the listings tab, which is the default. */
const VISIBLE_CARDS = 6;

/**
 * Seller profile shell. Mirrors the layout in `page.tsx`.
 *
 * Free of data and i18n calls: this file is what the router prefetches.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 lg:px-20">
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* `bg-ink-900` and `bg-tint` invert together, so the bones stay legible
          on the banner in both themes. Don't hardcode a tint here. */}
      <section className="bg-ink-900 mt-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-8 sm:flex-row sm:items-center lg:px-20">
          <Skeleton className="size-[88px] shrink-0 rounded-[44px]" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
            <div className="mt-1 flex flex-wrap gap-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-11 w-32 shrink-0 rounded-[22px]" />
        </div>
      </section>

      {/* Listings / Reviews / About */}
      <nav className="border-line border-b">
        <div className="mx-auto flex max-w-[1440px] gap-1 px-4 lg:px-20">
          <div className="flex h-13 items-center px-5">
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="flex h-13 items-center px-5">
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="flex h-13 items-center px-5">
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 lg:px-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="bg-base border-line w-full shrink-0 overflow-hidden rounded-12 border py-4 lg:w-[220px]">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="px-5 py-2.5">
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-[16px]" />
                <Skeleton className="h-8 w-24 rounded-[16px]" />
                <Skeleton className="h-8 w-20 rounded-[16px]" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: VISIBLE_CARDS }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

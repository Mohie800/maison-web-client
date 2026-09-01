import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/**
 * Shared shell for every `/account/*` page.
 *
 * Deliberately generic. All 28 account pages hang off the same sidebar, so this
 * cascades correctly to child segments — but their content areas differ, so the
 * right-hand side is neutral blocks rather than any one page's layout. Nothing
 * here promises a shape the resolved page won't have.
 *
 * Free of data and i18n calls: this file is what the router prefetches.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        <div className="pb-6">
          <Skeleton className="h-8 w-56" />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* AccountSidebar — same on every page in this group */}
          <aside className="w-full shrink-0 lg:w-[220px]">
            <div className="bg-base border-line-200 overflow-hidden rounded-12 border py-5">
              <div className="flex flex-col items-center gap-1.5 px-4 pb-4">
                <Skeleton className="size-13 rounded-[26px]" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>

              <span className="bg-fill-100 block h-px w-full" aria-hidden />

              {/* Eleven nav rows, then sign out */}
              <div className="flex flex-col">
                {Array.from({ length: 11 }, (_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>

              <span className="bg-fill-100 block h-px w-full" aria-hidden />

              <div className="px-5 py-3">
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Skeleton className="h-28 w-full rounded-16" />
            <Skeleton className="h-64 w-full rounded-16" />
            <Skeleton className="h-40 w-full rounded-16" />
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

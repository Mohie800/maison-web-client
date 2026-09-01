import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/**
 * The inbox index, and only the index — it sits in the `(index)` group so that
 * `/inbox/[id]` is outside its boundary. It used to cover both, which meant
 * every move from one thread to another replaced the rail and the open
 * conversation with bones for as long as the fetch took. A thread route now
 * streams its own pane instead (`ThreadPending`), leaving the rail alone.
 *
 * Free of data and i18n calls: this file is what the router prefetches.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 lg:px-20">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-7 w-28 rounded-[14px]" />
        </div>

        {/* All / Buying / Selling / Trade */}
        <div className="flex flex-wrap gap-2.5">
          <Skeleton className="h-9 w-16 rounded-20" />
          <Skeleton className="h-9 w-20 rounded-20" />
          <Skeleton className="h-9 w-20 rounded-20" />
          <Skeleton className="h-9 w-16 rounded-20" />
        </div>

        {/* ChatLayout — list beside thread */}
        <div className="bg-base border-line-200 flex h-[640px] flex-col items-stretch overflow-hidden rounded-16 border lg:flex-row lg:items-start">
          <div className="flex w-full shrink-0 flex-col lg:w-[340px]">
            <div className="border-line-200 flex h-12 w-full shrink-0 items-center border px-4">
              <Skeleton className="h-3.5 w-40" />
            </div>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="border-line-200 flex items-center gap-3 border-b p-4"
              >
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* No thread is open on this route — the pane is the prompt to pick one. */}
          <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 p-10 lg:flex">
            <Skeleton className="size-8 rounded-8" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </div>
    </SkeletonRoot>
  );
}

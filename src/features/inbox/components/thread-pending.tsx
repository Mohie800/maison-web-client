import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/**
 * The open conversation while its two requests are in flight — `651:6864`
 * onwards, in bones.
 *
 * Only this pane: the rail keeps its rows, because the thread is the only part
 * of the screen the navigation changed.
 */
export function ThreadPending() {
  return (
    <SkeletonRoot className="hidden min-w-0 flex-1 lg:block">
      <div className="flex h-full flex-col gap-4 p-6">
        {/* Head — 651:6866 */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-px w-full rounded-none" />

        {/* Bubbles, bottom-aligned as the thread is */}
        <div className="flex flex-1 flex-col justify-end gap-3">
          <Skeleton className="h-12 w-2/3 rounded-12" />
          <Skeleton className="h-16 w-3/5 self-end rounded-12" />
          <Skeleton className="h-12 w-1/2 rounded-12" />
        </div>

        {/* Composer — 651:6893 */}
        <Skeleton className="h-12 w-full rounded-12" />
      </div>
    </SkeletonRoot>
  );
}

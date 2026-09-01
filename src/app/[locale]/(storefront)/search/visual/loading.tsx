import { Skeleton, SkeletonRoot } from "@/components/ui/skeleton";

/**
 * Visual search fetches nothing, so this exists only to stop `/search`'s
 * results-grid shell from standing in for a screen that has no grid.
 */
export default function Loading() {
  return (
    <SkeletonRoot className="bg-surface flex min-h-full flex-col">
      {/* VS_TopBar */}
      <div className="bg-base border-line border-b">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-20">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-[26px] w-24 shrink-0 rounded-[13px]" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-20">
        <Skeleton className="h-64 w-full rounded-16" />
      </div>
    </SkeletonRoot>
  );
}

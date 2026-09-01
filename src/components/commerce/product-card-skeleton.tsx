import { Skeleton } from "@/components/ui/skeleton";

/** Matches `ProductCard`'s frame so a grid doesn't reflow when results land. */
export function ProductCardSkeleton() {
  return (
    <article className="bg-base border-line-200 flex flex-col overflow-hidden rounded-16 border">
      <Skeleton className="aspect-square w-full rounded-none" />

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {/* Category + condition pill */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-[22px] w-14 rounded-[11px]" />
        </div>

        {/* Title, two lines — `line-clamp-2` in the real card */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />

        <Skeleton className="h-3 w-20" />

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-[30px] shrink-0 rounded-[15px]" />
        </div>

        <div className="mt-3 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-10" />
          <Skeleton className="h-10 flex-1 rounded-10" />
        </div>
      </div>
    </article>
  );
}

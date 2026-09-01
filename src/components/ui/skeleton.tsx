import { cn } from "@/lib/utils";

/**
 * Wrapper for a loading shell.
 *
 * The pulse lives here rather than on each bone: one animation for the whole
 * tree instead of one per element, and every block breathes in step.
 */
export function SkeletonRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} role="status" aria-busy="true">
      <div className="animate-pulse" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/** A placeholder block. Animated by the enclosing `SkeletonRoot`. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-tint rounded-[4px]", className)} />;
}

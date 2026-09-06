import { Star } from "lucide-react";

/**
 * Rating stars — `651:15276`. The frame draws them as plain squares; real star
 * glyphs are the obvious reading, and the storefront's review list already uses
 * lucide's.
 *
 * The portal's frames tint them `semantic/warning`, not the `accent/gold` the
 * storefront uses. Following the frame.
 */
export function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="flex shrink-0 gap-[2px]" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          style={{ width: size, height: size }}
          className={
            n <= Math.round(rating)
              ? "text-warning fill-current"
              : "text-line-200 fill-current"
          }
        />
      ))}
    </span>
  );
}

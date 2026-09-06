import type { VisitsPoint } from "@/lib/api/schemas/vendor";

/**
 * The visits chart on Customer Insights — `651:14635`.
 *
 * The frame titles this "Peak Purchase Hours". The data is one point per **day**
 * (GAP-107), not per hour, and counts visits rather than purchases, so it is
 * labelled for what it plots. Renaming the frame is the smaller change; see
 * plans/09 C76.
 *
 * Same bar treatment as the revenue chart: heights scale to the tallest point,
 * floored so a zero day still draws a baseline, and the latest day takes the
 * accent.
 */
export function VisitsChart({
  points,
  title,
}: {
  points: VisitsPoint[];
  title: string;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.visits ?? 0), 0);
  const last = points.length - 1;

  return (
    <section className="bg-vp-panel border-line-200 rounded-8 flex h-[180px] flex-col gap-2.5 border px-4 py-3.5">
      <h2 className="text-ink-900 dark:text-ink-450 text-[12px] font-semibold">
        {title}
      </h2>
      <div className="flex h-[104px] items-end gap-[3px]">
        {points.map((point, index) => {
          const visits = point.visits ?? 0;
          const height = max > 0 ? Math.max(4, (visits / max) * 104) : 4;
          return (
            <span
              key={point.date}
              title={`${point.date}: ${visits}`}
              className={`min-w-px flex-1 rounded-[2px] ${
                index === last ? "bg-purple" : "bg-line-200"
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </section>
  );
}

import { Link } from "@/i18n/navigation";
import type { SalesPoint } from "@/lib/api/schemas/vendor";

/**
 * The portal's inline bar chart — `651:13582` on the dashboard, `651:14476` and
 * `651:14635` on the analytics screens, which use the same chart at 180px with
 * a 104px band.
 *
 * `chartData` is already one zero-filled point per day across the window, so
 * the bars map straight onto it with no bucketing. Heights scale to the tallest
 * bar, floored at 4px so a zero day still draws a baseline rather than
 * vanishing.
 *
 * The frame prints "7D 30D 90D" as flat text with no selected state. They are
 * links here, and the current range is emphasised — a control that cannot show
 * which range you are on is not usable. Recorded in plans/09 C67.
 */
const RANGES = ["7d", "30d", "90d"] as const;
export type SalesRange = (typeof RANGES)[number];

export function RevenueChart({
  points,
  range,
  title,
  rangeLabels,
  basePath = "/vendor",
  tall = false,
}: {
  points: SalesPoint[];
  range: SalesRange;
  title: string;
  rangeLabels: Record<SalesRange, string>;
  basePath?: string;
  /** The analytics screens draw the same chart at 180px. */
  tall?: boolean;
}) {
  const max = points.reduce((m, p) => Math.max(m, p.amount ?? 0), 0);
  const band = tall ? 104 : 40;
  const last = points.length - 1;

  return (
    <div
      className={`bg-vp-panel border-line-200 rounded-8 flex flex-col gap-3 border p-4 ${
        tall ? "h-[180px]" : "h-[120px]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-ink-900 dark:text-ink-450 text-[12px] font-semibold">
          {title}
        </p>
        <div className="flex gap-2">
          {RANGES.map((value) => (
            <Link
              key={value}
              href={`${basePath}?range=${value}`}
              aria-current={value === range ? "true" : undefined}
              className={
                value === range
                  ? "text-ink-900 text-[10px] font-semibold"
                  : "text-ink-500 dark:text-ink-450 hover:text-ink-900 text-[10px]"
              }
            >
              {rangeLabels[value]}
            </Link>
          ))}
        </div>
      </div>

      <div
        className="flex items-end gap-[3px]"
        style={{ height: `${band}px` }}
      >
        {points.map((point, index) => {
          const amount = point.amount ?? 0;
          const height = max > 0 ? Math.max(4, (amount / max) * band) : 4;
          return (
            <span
              key={point.date}
              /* The latest day is the accent bar in the frame. */
              className={`min-w-px flex-1 rounded-[2px] ${
                index === last ? "bg-aqua" : "bg-line-200"
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}

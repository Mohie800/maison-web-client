import { Link } from "@/i18n/navigation";
import type { SalesRange } from "./revenue-chart";

/**
 * 7D / 30D / 90D — `651:14291`. Every analytics screen carries it, and all
 * three windows are real: `/vendor-portal/sales` takes `startDate`/`endDate`.
 *
 * The selected button is a 1.5px action border on the action tint; the rest are
 * a 0.5px hairline. Rendered as links so the window survives a reload and can
 * be shared.
 */
const RANGES: SalesRange[] = ["7d", "30d", "90d"];

export function PeriodPicker({
  basePath,
  active,
  labels,
}: {
  basePath: string;
  active: SalesRange;
  labels: Record<SalesRange, string>;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {RANGES.map((range) => {
        const isActive = range === active;
        return (
          <Link
            key={range}
            href={`${basePath}?range=${range}`}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-8 flex h-8 items-center justify-center px-3.5 text-[12px] ${
              isActive
                ? "bg-vp-action border-action text-action dark:text-aqua border-[1.5px] font-bold"
                : "border-line-200 text-ink-500 dark:text-ink-450 border-[0.5px]"
            }`}
          >
            {labels[range]}
          </Link>
        );
      })}
    </div>
  );
}

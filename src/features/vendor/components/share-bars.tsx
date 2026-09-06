/**
 * Labelled share bars — `651:14362` ("Sales by Category"), the same card the
 * demographics panels use.
 *
 * The accent rotates per row in the frame's order: action, info, amber, purple.
 * Percentages are always the server's own — `byCity` / `byCountry` return
 * `percentage` alongside `count`, and re-deriving it from the count would round
 * differently.
 */
export interface Share {
  label: string;
  percent: number;
}

const ACCENTS = [
  { text: "text-action dark:text-aqua", fill: "bg-action dark:bg-aqua" },
  { text: "text-info", fill: "bg-info" },
  { text: "text-amber-deep", fill: "bg-amber-deep" },
  { text: "text-purple", fill: "bg-purple" },
];

export function ShareBars({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Share[];
  empty: string;
}) {
  return (
    <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex min-w-0 flex-1 flex-col gap-3 border p-4">
      <h2 className="text-ink-900 text-[14px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-ink-500 dark:text-ink-450 text-[12px]">{empty}</p>
      ) : (
        rows.map((row, index) => {
          const accent = ACCENTS[index % ACCENTS.length];
          return (
            <div key={row.label} className="flex flex-col gap-1">
              <div className="flex items-start justify-between text-[12px]">
                <span className="text-ink-900 truncate" dir="auto">
                  {row.label}
                </span>
                <span className={`shrink-0 font-bold ${accent.text}`} dir="ltr">
                  {row.percent}%
                </span>
              </div>
              <div className="bg-fill-100 h-2 overflow-hidden rounded-[4px]">
                <div
                  className={`h-2 rounded-[4px] ${accent.fill}`}
                  style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

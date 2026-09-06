/**
 * KPI card — `651:13549` light, `651:10912` dark. Both dashboard rows are built
 * from it, and the analytics screens reuse it.
 *
 * The dark frame is not a recolour of the light one: the card sits on `bg/tint`
 * and the badge on the portal's own tint ramp, so the `dark:` pairs here are
 * designed values. See the `t-vp-*` notes in design/figma-tokens.json.
 *
 * `tone` is the badge, not the card: green for a positive delta, red for
 * anything wanting attention (pending listings, orders awaiting payout).
 */
export function StatCard({
  value,
  label,
  badge,
  tone = "positive",
}: {
  value: string;
  label: string;
  badge?: string | null;
  tone?: "positive" | "alert";
}) {
  return (
    <div className="bg-base dark:bg-tint border-line-200 rounded-12 flex min-w-0 flex-1 flex-col gap-1.5 border p-4">
      <p className="text-ink-900 truncate text-[22px] leading-[27px] font-bold">
        {value}
      </p>
      <p className="text-ink-500 dark:text-ink-450 truncate text-[11px] leading-[13px]">
        {label}
      </p>
      {badge && (
        <span
          dir="ltr"
          className={`flex h-[18px] w-fit items-center rounded-[9px] px-1.5 text-[9px] font-bold ${
            tone === "alert"
              ? "bg-vp-error text-error"
              : "bg-vp-action text-action dark:text-aqua"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

import { getTranslations } from "next-intl/server";

/**
 * Status pill. Tones follow the design: shipped reads informational, delivered
 * positive, processing/packed cautionary, cancelled negative.
 */
const TONE: Record<string, string> = {
  placed: "bg-tint text-ink-secondary",
  pending: "bg-tint text-ink-secondary",
  packed: "bg-tint text-warning",
  processing: "bg-tint text-warning",
  shipped: "bg-tint text-info",
  delivered: "bg-action-tint text-action",
  cancelled: "bg-tint text-error",
};

export async function OrderStatusBadge({ status }: { status: string }) {
  const t = await getTranslations("Orders");
  const tone = TONE[status] ?? "bg-tint text-ink-secondary";

  return (
    <span
      className={`rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase ${tone}`}
    >
      {/* Unknown statuses fall back to the raw value rather than a blank pill. */}
      {t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status}
    </span>
  );
}

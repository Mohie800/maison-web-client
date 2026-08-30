import { getTranslations } from "next-intl/server";

/**
 * Status pill. Tones follow the design: shipped reads informational, delivered
 * positive, processing/packed cautionary, cancelled negative.
 *
 * Every state tints its background. The order list used to draw all but
 * `delivered` on the neutral grey `bg-tint`, which the design does not — its
 * Shipped chip is blue-on-blue and Processing amber-on-amber (`651:8213`).
 *
 * Two shapes. `sm` is the compact chip the order list uses; `pill` is the
 * 28px-tall badge on the tracking header (Figma `651:8348`).
 */
const TONE: Record<string, string> = {
  placed: "bg-tint text-ink-secondary",
  pending: "bg-warn-tint3 text-amber-text",
  packed: "bg-warn-tint3 text-amber-text",
  processing: "bg-warn-tint3 text-amber-text",
  shipped: "bg-info-tint text-info",
  delivered: "bg-action-tint text-action",
  cancelled: "bg-error-tint text-error",
  paid: "bg-action-tint text-action",
};

const SHAPE = {
  sm: "rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase",
  pill: "flex h-[28px] items-center justify-center rounded-[14px] px-3 text-[12px] font-bold",
} as const;

export async function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: keyof typeof SHAPE;
}) {
  const t = await getTranslations("Orders");
  const tone = TONE[status] ?? "bg-tint text-ink-secondary";

  return (
    <span className={`shrink-0 ${SHAPE[size]} ${tone}`}>
      {/* Unknown statuses fall back to the raw value rather than a blank pill. */}
      {t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status}
    </span>
  );
}

import { getTranslations } from "next-intl/server";

/**
 * Status pill. Tones follow the design: shipped reads informational, delivered
 * positive, processing/packed cautionary, cancelled negative.
 *
 * Every state tints its background. The order list used to draw all but
 * `delivered` on the neutral grey `bg-tint`, which the design does not — its
 * Shipped chip is blue-on-blue and Processing amber-on-amber (`651:8213`).
 *
 * Two shapes. `sm` is the OCard chip — 24px, 11px medium, `rounded-12`
 * (`651:8284`); `pill` is the 28px badge on the tracking header (`651:8348`).
 */
const TONE: Record<string, string> = {
  placed: "bg-fill-100 text-ink-500",
  pending: "bg-warn-tint text-amber-deep",
  packed: "bg-warn-tint text-amber-deep",
  processing: "bg-warn-tint text-amber-deep",
  shipped: "bg-info-tint text-info",
  delivered: "bg-action-tint text-action",
  cancelled: "bg-error-tint text-error",
  paid: "bg-action-tint text-action",
};

const SHAPE = {
  sm: "flex h-6 items-center rounded-12 px-2.5 text-[11px] font-medium",
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
  const tone = TONE[status] ?? "bg-fill-100 text-ink-500";

  return (
    <span className={`shrink-0 ${SHAPE[size]} ${tone}`}>
      {/* Unknown statuses fall back to the raw value rather than a blank pill. */}
      {t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status}
    </span>
  );
}

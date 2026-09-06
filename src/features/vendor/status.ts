/**
 * Status pill tones — `651:13609`/`13618`/`13627` light, `651:10970`/`10979`/
 * `10988` dark, which draw Delivered green, Shipped blue and Processing amber.
 *
 * The tints are the portal's own ramp rather than the global ones: the dark
 * frames use #1E3A2F / #1E2D5E / #3A2E1E, none of which is the dark value of
 * the token the light frame binds.
 *
 * Keyed on every status the seller-side reads can return, not only the three
 * the frame happens to show.
 */
const TONES: Record<string, string> = {
  delivered: "bg-vp-action text-action dark:text-aqua",
  shipped: "bg-vp-info text-info",
  out_for_delivery: "bg-vp-info text-info",
  processing: "bg-vp-warn text-amber-deep",
  packed: "bg-vp-warn text-amber-deep",
  placed: "bg-vp-warn text-amber-deep",
  pending: "bg-vp-warn text-amber-deep",
  paid: "bg-vp-warn text-amber-deep",
  cancelled: "bg-vp-error text-error",
  refunded: "bg-fill-100 text-ink-500",
};

export function statusTone(status: string | null | undefined): string {
  return TONES[String(status)] ?? "bg-fill-100 text-ink-500";
}

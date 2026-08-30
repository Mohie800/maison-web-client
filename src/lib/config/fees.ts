/**
 * The fee on an amount, for the worked examples on the pricing and sell screens.
 *
 * The rate itself is not here — it comes from `GET /settings/fees`
 * (`getPlatformFees()` in lib/api/endpoints/settings.ts). Server components
 * await it; client components take it as a prop.
 */
export function platformFee(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

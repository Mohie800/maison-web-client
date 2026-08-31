import { z } from "zod";

/**
 * `GET /coupons/me`.
 *
 * The envelope is confirmed against the live endpoint — `summary`, `counts` and
 * `items` — but **no account on dev has ever held a coupon** (plans/08 D1) and
 * `/docs-json` publishes no response schema (API-05). The row below is taken
 * from `CreateCouponDto`, which is published and is what a coupon is made of.
 * Every field is optional and the card renders only what is present.
 */

const money = z.union([z.string(), z.number()]).nullish();

export const COUPON_TABS = ["available", "used", "expired"] as const;
export type CouponTab = (typeof COUPON_TABS)[number];

export function isCouponTab(value: unknown): value is CouponTab {
  return COUPON_TABS.includes(value as CouponTab);
}

export const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"] as const;

export const couponSchema = z.object({
  id: z.string().nullish(),
  code: z.string(),
  name: z.string().nullish(),
  discountType: z.string().nullish(),
  discountValue: money,
  maxDiscountAmount: money,
  minOrderAmount: money,
  usageLimit: z.number().nullish(),
  startsAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
  isActive: z.boolean().nullish(),
  /** Set once redeemed. Which of the three tabs a row belongs to. */
  usedAt: z.string().nullish(),
  status: z.string().nullish(),
  currency: z.string().nullish(),
});

export type Coupon = z.infer<typeof couponSchema>;

export const myCouponsSchema = z.object({
  summary: z
    .object({
      activeCount: z.number().nullish(),
      potentialSavings: money,
      currency: z.string().nullish(),
    })
    .nullish(),
  counts: z
    .object({
      available: z.number().nullish(),
      used: z.number().nullish(),
      expired: z.number().nullish(),
    })
    .nullish(),
  items: z.array(couponSchema),
});

export type MyCoupons = z.infer<typeof myCouponsSchema>;

/**
 * Which tab a row belongs to, from whichever field the API turns out to use.
 *
 * `status` is preferred when present; otherwise `usedAt` marks a redeemed
 * coupon and `expiresAt` in the past an expired one.
 */
export function couponTab(coupon: Coupon, now = new Date()): CouponTab {
  if (coupon.status && isCouponTab(coupon.status)) return coupon.status;
  if (coupon.usedAt) return "used";
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return "expired";
  return "available";
}

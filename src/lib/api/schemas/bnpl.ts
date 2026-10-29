import { z } from "zod";

/** Tabby / Tamara redirect payments — `/payments/bnpl/*`, verified 2026-10-29. */

export const BNPL_PROVIDERS = ["tabby", "tamara"] as const;
export type BnplProvider = (typeof BNPL_PROVIDERS)[number];

export function isBnplProvider(value: unknown): value is BnplProvider {
  return (BNPL_PROVIDERS as readonly unknown[]).includes(value);
}

const money = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? null : String(v)));

export const bnplOptionSchema = z.object({
  provider: z.enum(BNPL_PROVIDERS),
  available: z.boolean(),
  reason: z.string().nullish(),
  instalments: z.number(),
  instalmentAmount: money,
  minAmount: money,
  maxAmount: money,
});

export type BnplOption = z.infer<typeof bnplOptionSchema>;

export const PAYMENT_SESSION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "expired",
] as const;

export const paymentSessionSchema = z.object({
  sessionId: z.string(),
  provider: z.enum(BNPL_PROVIDERS),
  status: z.enum(PAYMENT_SESSION_STATUSES),
  amount: money,
  currency: z.string().nullish(),
  checkoutUrl: z.string().nullish(),
  orderId: z.string().nullish(),
  /** Internal — never shown to the buyer. */
  failureReason: z.string().nullish(),
  expiresAt: z.string().nullish(),
});

export type PaymentSession = z.infer<typeof paymentSessionSchema>;

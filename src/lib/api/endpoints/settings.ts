import "server-only";
import { z } from "zod";
import { apiFetch } from "../client";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";

/**
 * Notification preferences — `GET/PATCH /users/me/notification-preferences`.
 *
 * plans/04 records these as having no endpoint. They do: six categories, each
 * with three channels. (The same object is also served from
 * `/notifications/preferences`.)
 */
export const NOTIFICATION_GROUPS = [
  "orders",
  "messages",
  "priceDrops",
  "promotions",
  "auctions",
  "social",
] as const;

export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

const channelsSchema = z.object({
  push: z.boolean().nullish(),
  email: z.boolean().nullish(),
  sms: z.boolean().nullish(),
});

export type Channels = z.infer<typeof channelsSchema>;

const preferencesSchema = z.object({
  orders: channelsSchema.nullish(),
  messages: channelsSchema.nullish(),
  priceDrops: channelsSchema.nullish(),
  promotions: channelsSchema.nullish(),
  auctions: channelsSchema.nullish(),
  social: channelsSchema.nullish(),
});

export type NotificationPreferences = z.infer<typeof preferencesSchema>;

export async function getNotificationPreferences() {
  const data = await serverApiFetch<unknown>(
    "/users/me/notification-preferences",
    { cache: "no-store" },
  );
  return parseResponse(
    preferencesSchema,
    data,
    "GET /users/me/notification-preferences",
  );
}

/**
 * The platform's seller fee — `GET /settings/fees` (GAP-56).
 *
 * Public, cacheable, and the single source of truth: the rate used to live in
 * three places (two on the API, one here) and had to be kept in step by hand.
 */
const feesSchema = z.object({
  platformFeePercent: z.number(),
  platformFeeRate: z.number(),
  currency: z.string(),
  /** "seller" — the buyer pays the listed price, the fee comes off the payout. */
  chargedTo: z.string(),
  /**
   * VAT (GAP-115), added in Round 9. Note it is the same 15% as the platform
   * fee and is **not** the same money: VAT is collected from the buyer and
   * remitted by the platform to ZATCA, while the fee is deducted from the
   * seller's payout. Anything user-facing has to keep those apart.
   */
  vat: z
    .object({
      ratePercent: z.number().nullish(),
      rate: z.number().nullish(),
      collectedBy: z.string().nullish(),
      remittedBy: z.string().nullish(),
      authority: z.string().nullish(),
      sellerNote: z.string().nullish(),
    })
    .nullish(),
});

export type PlatformFees = z.infer<typeof feesSchema>;

export async function getPlatformFees(): Promise<PlatformFees> {
  const data = await apiFetch<unknown>("/settings/fees", {
    next: { revalidate: 3600, tags: ["fees"] },
  });
  return parseResponse(feesSchema, data, "GET /settings/fees");
}

/**
 * `GET /auth/social/config` — which social sign-in buttons to draw.
 *
 * `enabled` and `providers` can no longer disagree since GAP-48: `enabled`
 * means at least one provider can actually verify a token. `switchedOff`
 * separates the two reasons for an empty row — the feature deliberately off
 * versus client ids not configured yet, which is today's state.
 */
const socialAuthConfigSchema = z.object({
  enabled: z.boolean(),
  switchedOff: z.boolean().nullish(),
  providers: z.array(z.string()),
});

export type SocialAuthConfig = z.infer<typeof socialAuthConfigSchema>;

export async function getSocialAuthConfig(): Promise<SocialAuthConfig> {
  const data = await apiFetch<unknown>("/auth/social/config", {
    next: { revalidate: 300, tags: ["social-auth"] },
  });
  return parseResponse(socialAuthConfigSchema, data, "GET /auth/social/config");
}

import { z } from "zod";

/**
 * `GET /notifications`.
 *
 * ⚠️ The item shape is inferred — no account on dev has a notification, and the
 * OpenAPI document publishes no response schema (GAP-79). Every field is
 * optional and the row renders only what is present.
 */
/**
 * The frame's tabs first, in its order, then the three the API filters on that
 * the design never drew. All seven answer since GAP-79 landed.
 */
export const NOTIFICATION_CATEGORIES = [
  "orders",
  "messages",
  "auctions",
  "trade",
  "priceDrops",
  "social",
  "promotions",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** The API takes the category in upper snake case. */
export const CATEGORY_PARAM: Record<NotificationCategory, string> = {
  orders: "ORDERS",
  messages: "MESSAGES",
  auctions: "AUCTIONS",
  trade: "TRADE",
  priceDrops: "PRICE_DROPS",
  social: "SOCIAL",
  promotions: "PROMOTIONS",
};

/**
 * `NotificationDto`, published with the Round 5 reply. Two things the earlier
 * guess got wrong: there is no `link` and no `message`. The destination is
 * `payload`, which carries the id of whatever the row is about, and unread is
 * `readAt === null` rather than an `isRead` flag.
 */
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string().nullish(),
  category: z.string().nullish(),
  title: z.string().nullish(),
  body: z.string().nullish(),
  imageUrl: z.string().nullish(),
  /** `{ orderId }`, `{ listingId }`, `{ conversationId }`, `{ tradeId }`, `{ userId }`. */
  payload: z
    .object({
      orderId: z.string().nullish(),
      listingId: z.string().nullish(),
      conversationId: z.string().nullish(),
      tradeId: z.string().nullish(),
      userId: z.string().nullish(),
    })
    .nullish(),
  /** Null while unread. */
  readAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationsSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().nullish(),
  total: z.number().nullish(),
  categoryCounts: z
    .object({
      all: z.number().nullish(),
      orders: z.number().nullish(),
      messages: z.number().nullish(),
      auctions: z.number().nullish(),
      trade: z.number().nullish(),
      priceDrops: z.number().nullish(),
      social: z.number().nullish(),
      promotions: z.number().nullish(),
    })
    .nullish(),
});

export function isNotificationCategory(
  value: unknown,
): value is NotificationCategory {
  return NOTIFICATION_CATEGORIES.includes(value as NotificationCategory);
}

/** The frame's coloured badge — `ORDER`, `MSG`, `BID` — keyed by category. */
export const CATEGORY_TONE: Record<string, string> = {
  orders: "bg-info-tint text-info",
  priceDrops: "bg-error-tint text-error",
  social: "bg-action-tint text-action",
  promotions: "bg-purple-tint text-purple-text",
};

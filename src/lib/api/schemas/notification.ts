import { z } from "zod";

/**
 * `GET /notifications`.
 *
 * `NotificationDto` is published, and every event on the platform emits since
 * Round 6 (GAP-89). Fields stay optional so an unlisted type still renders.
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
 * `NotificationDto`. There is no `link` and no `message`: `title` is the bold
 * first line, `body` the second, and the destination is an id on `payload`.
 * Unread is `readAt === null` rather than an `isRead` flag.
 */

/** Every type the API emits. `PRICE_DROP` and `FLASH_SALE` have no trigger yet. */
export const NOTIFICATION_TYPES = [
  "ORDER_PLACED",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "LISTING_SOLD",
  "AUCTION_OUTBID",
  "AUCTION_WON",
  "TRADE_RECEIVED",
  "TRADE_ACCEPTED",
  "NEW_MESSAGE",
  "NEW_FOLLOWER",
  "NEW_REVIEW",
  "PRICE_DROP",
  "FLASH_SALE",
] as const;
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string().nullish(),
  category: z.string().nullish(),
  title: z.string().nullish(),
  body: z.string().nullish(),
  imageUrl: z.string().nullish(),
  /**
   * One entity id per type, plus its display number where there is one. The
   * trade key is `tradeRequestId`; `/docs-json` still documents it as `tradeId`,
   * so both are read (GAP-96).
   */
  payload: z
    .object({
      orderId: z.string().nullish(),
      orderNumber: z.string().nullish(),
      shipmentId: z.string().nullish(),
      listingId: z.string().nullish(),
      conversationId: z.string().nullish(),
      messageId: z.string().nullish(),
      tradeRequestId: z.string().nullish(),
      tradeId: z.string().nullish(),
      tradeNumber: z.string().nullish(),
      reviewId: z.string().nullish(),
      userId: z.string().nullish(),
      dueAt: z.string().nullish(),
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

/**
 * `category` comes back in the API's upper snake case (`PRICE_DROPS`) while the
 * tabs, tones and badges are keyed by the frame's camel case.
 */
export function toCategory(value: unknown): NotificationCategory {
  const match = NOTIFICATION_CATEGORIES.find(
    (key) => CATEGORY_PARAM[key] === value,
  );
  return match ?? "orders";
}

export function isNotificationCategory(
  value: unknown,
): value is NotificationCategory {
  return NOTIFICATION_CATEGORIES.includes(value as NotificationCategory);
}

/** The frame's coloured badge — `ORDER`, `MSG`, `BID` — keyed by category. */
export const CATEGORY_TONE: Record<string, string> = {
  orders: "bg-info-tint text-info",
  messages: "bg-action-tint text-action",
  auctions: "bg-warn-tint text-amber-deep",
  trade: "bg-success-tint text-success",
  priceDrops: "bg-error-tint text-error",
  social: "bg-action-tint text-action",
  promotions: "bg-purple-tint text-purple-text",
};

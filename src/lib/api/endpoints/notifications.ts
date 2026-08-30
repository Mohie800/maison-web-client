import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  CATEGORY_PARAM,
  notificationsSchema,
  type NotificationCategory,
} from "../schemas/notification";

export async function getNotifications(
  category?: NotificationCategory,
  page = 1,
) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (category) params.set("category", CATEGORY_PARAM[category]);

  const data = await serverApiFetch<unknown>(
    `/notifications?${params.toString()}`,
    { cache: "no-store" },
  );
  return parseResponse(notificationsSchema, data, "GET /notifications");
}

/**
 * Drives the bell's badge before the dropdown has fetched anything.
 *
 * Returns `{ total, orders, priceDrops, social, promotions }`; only the total
 * is needed here. Non-fatal — a failure hides the badge rather than the header.
 */
export async function getNotificationUnreadCount(): Promise<number> {
  try {
    const data = await serverApiFetch<{ total?: number | null }>(
      "/notifications/unread-count",
      { cache: "no-store" },
    );
    return data?.total ?? 0;
  } catch {
    return 0;
  }
}

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

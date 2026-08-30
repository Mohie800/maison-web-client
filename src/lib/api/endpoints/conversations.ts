import "server-only";
import { serverApiFetch } from "../server";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  conversationListSchema,
  conversationSchema,
  messageListSchema,
  unreadCountSchema,
  type InboxFilter,
} from "../schemas/conversation";

/**
 * Messaging reads — Flow 7. All of them need a session and none may be cached:
 * an inbox is the definition of a page that is wrong the moment it is stale.
 */

export async function getConversations(filter?: InboxFilter, q?: string) {
  const data = await serverApiFetch<unknown>("/conversations", {
    // `filter=all` is the default; sending it is harmless but pointless.
    params: { filter: filter === "all" ? undefined : filter, q, limit: 50 },
    cache: "no-store",
  });
  return parseResponse(conversationListSchema, data, "GET /conversations");
}

export async function getConversation(id: string) {
  try {
    const data = await serverApiFetch<unknown>(`/conversations/${id}`, {
      cache: "no-store",
    });
    return parseResponse(conversationSchema, data, "GET /conversations/{id}");
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

/**
 * `cursor` is the id of the oldest message already loaded, and the response is
 * a bare array in send order — so a page is prepended, not appended.
 */
export async function getMessages(id: string, cursor?: string, limit = 50) {
  const data = await serverApiFetch<unknown>(`/conversations/${id}/messages`, {
    params: { cursor, limit },
    cache: "no-store",
  });
  return parseResponse(
    messageListSchema,
    data,
    "GET /conversations/{id}/messages",
  );
}

/** Drives the header badge. Non-fatal: the badge hides rather than erroring. */
export async function getUnreadCount(): Promise<number> {
  try {
    const data = await serverApiFetch<unknown>("/conversations/unread-count", {
      cache: "no-store",
    });
    return (
      parseResponse(
        unreadCountSchema,
        data,
        "GET /conversations/unread-count",
      ).unreadConversations ?? 0
    );
  } catch {
    return 0;
  }
}

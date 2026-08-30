import { z } from "zod";

/**
 * Messaging — `/conversations` and `/conversations/{id}/messages`.
 *
 * Shapes taken from a conversation driven end to end on dev; the spec documents
 * requests but no responses. Unlike the trade payloads, these carry what the
 * screens need: the other participant, the listing context, and a preview.
 */

/** `GET /conversations?filter=` — the four chips on `651:6910`. */
export const INBOX_FILTERS = ["all", "buying", "selling", "trade"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export function isInboxFilter(value: string): value is InboxFilter {
  return (INBOX_FILTERS as readonly string[]).includes(value);
}

const otherUserSchema = z.object({
  id: z.string(),
  fullName: z.string().nullish(),
  profilePic: z.string().nullish(),
  isOnline: z.boolean().nullish(),
});

/** The list endpoint returns id + title only; the header adds a cover photo. */
const listingRefSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  price: z.string().nullish(),
  condition: z.string().nullish(),
  coverPhotoUrl: z.string().nullish(),
});

export const conversationRowSchema = z.object({
  id: z.string(),
  /** `buying` | `selling` | `trade` — which side of it the viewer is on. */
  perspective: z.string().nullish(),
  listing: listingRefSchema.nullish(),
  otherUser: otherUserSchema.nullish(),
  lastMessagePreview: z.string().nullish(),
  lastMessageAt: z.string().nullish(),
  lastMessageIsMine: z.boolean().nullish(),
  unreadCount: z.number().nullish(),
});

export type ConversationRow = z.infer<typeof conversationRowSchema>;

export const conversationListSchema = z.object({
  items: z.array(conversationRowSchema),
  total: z.number().nullish(),
  page: z.number().nullish(),
  limit: z.number().nullish(),
});

/** `GET /conversations/{id}` — the header strip on `651:6866`. */
export const conversationSchema = z.object({
  id: z.string(),
  type: z.string().nullish(),
  perspective: z.string().nullish(),
  listing: listingRefSchema.nullish(),
  otherUser: otherUserSchema.nullish(),
  /**
   * Set when the thread hangs off a trade request rather than a listing.
   *
   * Note `offeredListings` here carries `coverPhotoUrl` — the join the trade
   * endpoints themselves are missing (GAP-83). It is the only place the offered
   * side of a swap arrives ready to render.
   */
  trade: z
    .object({
      id: z.string(),
      status: z.string().nullish(),
      requesterId: z.string().nullish(),
      offeredListings: z
        .array(
          z.object({
            id: z.string(),
            title: z.string().nullish(),
            price: z.string().nullish(),
            coverPhotoUrl: z.string().nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullish(),
  senderId: z.string(),
  type: z.string().nullish(),
  body: z.string().nullish(),
  attachmentUrl: z.string().nullish(),
  readAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export type Message = z.infer<typeof messageSchema>;

/** A bare array, oldest-first within the page — not a paginated object. */
export const messageListSchema = z.array(messageSchema);

export const unreadCountSchema = z.object({
  unreadConversations: z.number().nullish(),
});

export const MESSAGE_MAX = 2000;

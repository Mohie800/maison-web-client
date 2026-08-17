/**
 * The OpenAPI spec's `servers[]` is empty, so the base URL is convention rather
 * than contract. Confirmed staging/production URLs are an open question for the
 * backend team — see plans/06 G14.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://maison.dockbox.cloud";

/** Media is served from the API origin as relative /uploads/* paths. */
export const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL ?? API_BASE_URL;

export const API_PREFIX = "/api/v1";

/**
 * Polling intervals, in milliseconds.
 *
 * The API documents no WebSocket gateway (plans/06 G3), so live features poll.
 * They are centralised here so that swapping to a real-time transport touches
 * this module and the feature hooks, not every component.
 *
 * Polling is adequate for messaging and notifications. It is weak for auctions:
 * with anti-snipe extensions in play, bidders act on stale high bids.
 */
export const POLL_INTERVAL = {
  auctionStatus: 3_000,
  conversationMessages: 5_000,
  inboxUnread: 30_000,
  notifications: 60_000,
} as const;

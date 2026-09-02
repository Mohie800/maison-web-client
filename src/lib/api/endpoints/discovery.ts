import { z } from "zod";
import { apiFetch } from "../client";
import { serverApiFetch, viewerApiFetch } from "../server";
import { parseResponse } from "../parse";
import {
  paginatedCardsSchema,
  storyGroupSchema,
  storySchema,
  trendingSearchesSchema,
  topStoresSchema,
  type ProductCard,
  type Story,
  type StoryGroup,
  type TrendingSearch,
  type TopStore,
} from "../schemas/cards";

/**
 * Trending Now — live listings ordered by likes, already shaped as cards.
 *
 * Viewer-aware since GAP-100: the card DTO has carried `isLiked` all along, but
 * only answers it to a request it can identify.
 */
export async function getTrending(limit = 7): Promise<ProductCard[]> {
  const data = await viewerApiFetch<unknown>("/trends", {
    params: { limit },
    next: { revalidate: 300, tags: ["trends"] },
  });
  return parseResponse(paginatedCardsSchema, data, "GET /trends").items;
}

/**
 * Top Stores — sellers ranked by units sold this week.
 *
 * Returns `[]` early in a week with no sales (the rankings reset weekly and the
 * response carries `weekStart` / `rankingsUpdateAt`), so the section must have
 * a real empty state rather than assuming rows.
 */
export async function getTopStores(limit = 6): Promise<TopStore[]> {
  return (await getTopStoresWeek(limit)).items;
}

/**
 * The same call with its envelope — `weekStart` and `rankingsUpdateAt` are what
 * the Trend Hub's week badge is built from (Figma `651:1791`).
 */
export async function getTopStoresWeek(limit = 6) {
  const data = await apiFetch<unknown>("/trends/top-stores", {
    params: { limit },
    next: { revalidate: 900, tags: ["trends"] },
  });
  return parseResponse(topStoresSchema, data, "GET /trends/top-stores");
}

/** Active stories, flat — one row per story. */
export async function getStories(): Promise<Story[]> {
  const data = await apiFetch<unknown>("/stories", {
    next: { revalidate: 120, tags: ["stories"] },
  });
  return parseResponse(z.array(storySchema), data, "GET /stories");
}

/**
 * One author's active stories, ordered for sequential viewing.
 *
 * Public since GAP-52. A token is still sent when there is one, because `seen`
 * is the viewer's own state — anonymously every slide reads unseen and no view
 * is recorded.
 */
export async function getUserStories(userId: string): Promise<Story[]> {
  const data = await serverApiFetch<unknown>(`/stories/${userId}`);
  return parseResponse(z.array(storySchema), data, `GET /stories/${userId}`);
}

/**
 * Active stories grouped by author, for the stories bar (GAP-30).
 *
 * Authenticated and uncached, deliberately: `hasUnseen` and `seen` are the
 * viewer's own state, so a shared cache entry would show one person's watched
 * rings to another. `serverApiFetch` forces `no-store` for exactly this reason.
 *
 * Signed out, every author reads unseen — the honest answer for a visitor with
 * no history.
 */
export async function getStoryGroups(limit = 20): Promise<StoryGroup[]> {
  const data = await serverApiFetch<unknown>("/stories", {
    params: { groupBy: "user", limit },
  });
  return parseResponse(
    z.array(storyGroupSchema),
    data,
    "GET /stories?groupBy=user",
  );
}

/** Trending search terms, for the Trend Hub. */
export async function getTrendingSearches(): Promise<TrendingSearch[]> {
  const data = await apiFetch<unknown>("/search/trending", {
    next: { revalidate: 900, tags: ["trends"] },
  });
  return parseResponse(trendingSearchesSchema, data, "GET /search/trending")
    .trendingSearches;
}

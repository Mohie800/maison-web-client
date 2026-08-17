import { z } from "zod";
import { apiFetch } from "../client";
import { parseResponse } from "../parse";
import {
  paginatedCardsSchema,
  storySchema,
  topStoresSchema,
  type ProductCard,
  type Story,
  type TopStore,
} from "../schemas/cards";

/** Trending Now — live listings ordered by likes, already shaped as cards. */
export async function getTrending(limit = 7): Promise<ProductCard[]> {
  const data = await apiFetch<unknown>("/trends", {
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
  const data = await apiFetch<unknown>("/trends/top-stores", {
    params: { limit },
    next: { revalidate: 900, tags: ["trends"] },
  });
  return parseResponse(topStoresSchema, data, "GET /trends/top-stores").items;
}

/** Active stories for the stories bar. */
export async function getStories(): Promise<Story[]> {
  const data = await apiFetch<unknown>("/stories", {
    next: { revalidate: 120, tags: ["stories"] },
  });
  return parseResponse(z.array(storySchema), data, "GET /stories");
}

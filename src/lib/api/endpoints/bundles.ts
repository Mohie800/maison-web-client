import { apiFetch } from "../client";
import { parseResponse } from "../parse";
import { ApiError } from "../errors";
import {
  bundleListSchema,
  bundleSchema,
  type BundleSort,
} from "../schemas/bundle";

/**
 * Bundles — public reads, so they cache like the rest of the catalogue.
 *
 * `savings_desc` is the sort the API documents as powering the home rail;
 * `newest` is the default.
 */
export async function getBundles(
  { sort, sellerId, page = 1, limit = 24 }: {
    sort?: BundleSort;
    sellerId?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const data = await apiFetch<unknown>("/bundles", {
    params: { sort, sellerId, page, limit },
    next: { revalidate: 60, tags: ["bundles"] },
  });
  return parseResponse(bundleListSchema, data, "GET /bundles");
}

export async function getBundle(id: string) {
  try {
    const data = await apiFetch<unknown>(`/bundles/${id}`, {
      next: { revalidate: 60, tags: ["bundles"] },
    });
    return parseResponse(bundleSchema, data, "GET /bundles/{id}");
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

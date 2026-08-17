import { MEDIA_BASE_URL } from "./config";

/**
 * The API returns media as relative paths ("/uploads/listings/….jpg").
 * This is the only place that knows the media host — if the backend moves
 * uploads to a CDN (plans/06 G12), this function is the single change.
 */
export function resolveMediaUrl(
  path: string | null | undefined,
): string | null {
  if (!path || typeof path !== "string") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

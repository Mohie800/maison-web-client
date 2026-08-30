import "server-only";
import { getStoryGroups, getUserStories } from "@/lib/api/endpoints/discovery";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";

/**
 * The story viewer's data, shaped for the client.
 *
 * Loaded once here and used by both routes that can render the viewer — the
 * intercepted modal and the standalone page — so the two can't drift.
 *
 * Everything is resolved to plain serialisable values: the viewer is a client
 * component, and media URLs, relative timestamps and prices all need resolving
 * on the server anyway.
 */

export interface StorySlide {
  id: string;
  mediaUrl: string | null;
  caption: string | null;
  createdAt: string | null;
  listing: {
    id: string;
    title: string;
    photoUrl: string | null;
    condition: string | null;
    categoryName: string | null;
    price: string | null;
    originalPrice: string | null;
    currency: string;
  } | null;
}

export interface StoryView {
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  slides: StorySlide[];
  startIndex: number;
  /** Neighbouring authors, for the dimmed panels and for run-on advancing. */
  prevAuthorId: string | null;
  nextAuthorId: string | null;
  /** A view belongs to an account, so the viewer only records one when signed in. */
  signedIn: boolean;
}

export async function loadStoryView(
  userId: string,
  rawIndex: string | undefined,
  fallbackName: string,
): Promise<StoryView | "empty"> {
  const viewer = await getCurrentUser();

  const [stories, groups] = await Promise.all([
    getUserStories(userId),
    getStoryGroups().catch(() => []),
  ]);
  if (stories.length === 0) return "empty";

  const parsed = Number(rawIndex ?? 0);
  const startIndex = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), 0), stories.length - 1)
    : 0;

  const author = stories[0].user;
  const order = groups.map((group) => group.userId);
  const at = order.indexOf(userId);

  return {
    authorId: userId,
    authorName: author?.username ?? author?.fullName ?? fallbackName,
    authorAvatar: resolveMediaUrl(
      stories[0].authorPhotoUrl ?? author?.profilePic,
    ),
    startIndex,
    signedIn: Boolean(viewer),
    prevAuthorId: at > 0 ? order[at - 1] : null,
    nextAuthorId: at >= 0 && at < order.length - 1 ? order[at + 1] : null,
    slides: stories.map((story) => ({
      id: story.id,
      mediaUrl: resolveMediaUrl(story.mediaUrl),
      caption: story.caption ?? null,
      createdAt: story.createdAt ?? null,
      listing: story.listing
        ? {
            id: story.listing.id,
            title: story.listing.title ?? "",
            photoUrl: resolveMediaUrl(
              story.listing.coverPhotoUrl ?? story.listingPhotoUrl,
            ),
            condition: story.listing.condition ?? null,
            categoryName: story.listing.category?.name ?? null,
            price:
              story.listing.price != null ? String(story.listing.price) : null,
            originalPrice:
              story.listing.originalPrice != null
                ? String(story.listing.originalPrice)
                : null,
            currency: story.listing.currency ?? "SAR",
          }
        : null,
    })),
  };
}

import { getTranslations } from "next-intl/server";
import { resolveMediaUrl } from "@/lib/api/media";
import { getCurrentUser } from "@/lib/auth/current-user";
import { StoriesRow, type StoryRingItem } from "./stories-row";
import type { Story } from "@/lib/api/schemas/cards";

/**
 * Stories bar — Figma node 651:768.
 *
 * `GET /stories` returns one row **per story** (85 rows across 23 users in the
 * current data), but the design — and `GET /stories/{userId}`, which returns "a
 * user's active stories, ordered for sequential viewing" — treat a user as the
 * unit. So rows are grouped by author; otherwise the same person appears three
 * or four times in a row, which is what our first pass did.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function StoriesBar({ stories }: { stories: Story[] }) {
  const t = await getTranslations("Home");
  const viewer = await getCurrentUser();

  const seen = new Set<string>();
  const items: StoryRingItem[] = [];

  for (const story of stories) {
    // Keep the first occurrence: /stories is newest-first, so that's the
    // author's most recent story and the right entry point.
    if (seen.has(story.userId)) continue;
    seen.add(story.userId);

    // A user's own stories belong under "Your story", not in the rail.
    if (viewer && story.userId === viewer.id) continue;

    const name =
      story.user?.username ?? story.user?.fullName ?? t("someone");

    items.push({
      userId: story.userId,
      label: name,
      avatarUrl: resolveMediaUrl(
        story.authorPhotoUrl ?? story.user?.profilePic,
      ),
      initials: initialsOf(story.user?.fullName ?? name),
    });
  }

  const yourStory = viewer
    ? {
        label: t("yourStory"),
        avatarUrl: resolveMediaUrl(viewer.profilePic),
        initials: initialsOf(viewer.fullName),
      }
    : null;

  if (items.length === 0 && !yourStory) return null;

  return (
    <div className="bg-base border-line border-b">
      <div className="mx-auto max-w-[1440px] px-4 py-3 lg:px-20">
        <StoriesRow
          items={items}
          yourStory={yourStory}
          nextLabel={t("scrollNext")}
        />
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { resolveMediaUrl } from "@/lib/api/media";
import { getCurrentUser } from "@/lib/auth/current-user";
import { StoriesRow, type StoryRingItem } from "./stories-row";
import type { StoryGroup } from "@/lib/api/schemas/cards";

/**
 * Stories bar — Figma `651:768`.
 *
 * Fed by `?groupBy=user` (GAP-30), so the author is the unit — which is what
 * the design draws and what `GET /stories/{userId}` returns. The grouping,
 * the unseen flag and the ordering (unseen first, then recency) are all the
 * server's; we render the array as given rather than re-sorting it here.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function StoriesBar({ groups }: { groups: StoryGroup[] }) {
  const t = await getTranslations("Home");
  const viewer = await getCurrentUser();

  const items: StoryRingItem[] = groups
    // The viewer's own stories belong under "Your story", not in the rail.
    .filter((group) => !group.isSelf && group.userId !== viewer?.id)
    .map((group) => {
      const name = group.user?.username ?? group.user?.fullName ?? t("someone");
      return {
        userId: group.userId,
        label: name,
        avatarUrl: resolveMediaUrl(
          group.authorPhotoUrl ?? group.user?.profilePic,
        ),
        initials: initialsOf(group.user?.fullName ?? name),
        hasUnseen: group.hasUnseen ?? true,
      };
    });

  /**
   * "Your story" opens your own stories when you have some, and the composer
   * (`651:2162`) when you have none — which is what the design's `+` promises.
   */
  const ownGroup = groups.find(
    (group) => group.isSelf || group.userId === viewer?.id,
  );
  const yourStory = viewer
    ? {
        label: t("yourStory"),
        avatarUrl: resolveMediaUrl(viewer.profilePic),
        initials: initialsOf(viewer.fullName),
        href: ownGroup ? `/stories/${ownGroup.userId}` : "/stories/new",
      }
    : null;

  if (items.length === 0 && !yourStory) return null;

  return (
    <div className="bg-base border-line border-y">
      <div className="mx-auto flex h-[100px] max-w-[1440px] items-center px-4 lg:px-20">
        <StoriesRow
          items={items}
          yourStory={yourStory}
          nextLabel={t("scrollNext")}
        />
      </div>
    </div>
  );
}

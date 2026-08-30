import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadStoryView } from "@/features/stories/data";
import { StoryViewer } from "@/features/stories/components/story-viewer";

/**
 * Story viewer, standalone — a direct load, a refresh or a shared link.
 *
 * The same screen opens as a modal over whatever you were looking at when it's
 * reached by clicking a ring; that's the intercepted route in
 * `@storyModal/(.)stories/[userId]`. This one is the fallback the intercept
 * deliberately doesn't cover.
 *
 * Open to a signed-out visitor, like the bar that links here (GAP-52). Every
 * slide reads unseen for them and nothing is recorded — a view belongs to an
 * account.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function StoryViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ i?: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Stories");
  const view = await loadStoryView(
    userId,
    (await searchParams).i,
    t("someone"),
  );

  if (view === "empty") notFound();

  return <StoryViewer
      key={`${view.authorId}:${view.startIndex}`}
      view={view}
      mode="page"
    />;
}

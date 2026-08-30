import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadStoryView } from "@/features/stories/data";
import { StoryViewer } from "@/features/stories/components/story-viewer";

/**
 * Story viewer, intercepted — Figma `651:2122`.
 *
 * Clicking a ring opens the story over the page you were on and closes back to
 * it, which is what a story does. The URL is still `/stories/{userId}`, so it
 * is shareable and survives a refresh — the refresh just lands on the
 * standalone page under `(viewer)` instead.
 *
 * `(.)` matches the same segment level: route groups and `@slot` folders are
 * not route segments, so `stories` is one level under `[locale]` either way.
 */
export default async function StoryModal({
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
      mode="modal"
    />;
}

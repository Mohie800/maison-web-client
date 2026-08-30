import { setRequestLocale } from "next-intl/server";

/**
 * Chromeless full-screen surfaces — the story viewer.
 *
 * No header, no footer, no util bar: the frame (`651:2122`) is full-bleed dark
 * edge to edge, and site chrome around a story viewer is what made it read as a
 * page rather than a story.
 */
export default async function ViewerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <main className="flex-1">{children}</main>;
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getStoryGroups } from "@/lib/api/endpoints/discovery";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import type { StoryGroup } from "@/lib/api/schemas/cards";

/**
 * Stories hub — Figma `651:2045` (Web_Stories_Hub).
 *
 * Two sections off one call: `GET /stories?groupBy=user` gives the ring row and,
 * through each group's `latestStory`, the "Latest stories" grid beneath it.
 *
 * The frame's rings are gradient SVGs. The ring here is the seen/unseen signal
 * the homepage row already established — an aqua border for an author with
 * something unwatched, nothing for one you have been through (GAP-30) — scaled
 * to this frame's 96/86. A decorative gradient would throw that meaning away.
 */
export const metadata: Metadata = {
  title: "Stories",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default async function StoriesHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Stories");
  const [groups, viewer] = await Promise.all([
    getStoryGroups(20).catch(() => [] as StoryGroup[]),
    getCurrentUser(),
  ]);

  const own = groups.find(
    (group) => group.isSelf || group.userId === viewer?.id,
  );
  const others = groups.filter((group) => group !== own);

  const latest = groups
    .filter((group) => group.latestStory?.mediaUrl)
    .sort((a, b) => (b.lastStoryAt ?? "").localeCompare(a.lastStoryAt ?? ""));

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-12 pb-14 lg:px-20">
        <h1 className="text-ink text-[28px] font-bold">{t("hubTitle")}</h1>
        <p className="text-ink-secondary mt-2 text-[14px]">{t("hubBody")}</p>

        {/* Ring row — 651:2054 */}
        <div className="scrollbar-none mt-8 flex items-start gap-6 overflow-x-auto">
          {viewer && (
            <Link
              href="/stories/new"
              className="flex w-24 shrink-0 flex-col items-center gap-2"
            >
              <span className="border-azure relative flex size-24 items-center justify-center rounded-full border-2 border-dashed">
                <span className="bg-fill-100 text-action flex size-[86px] items-center justify-center overflow-hidden rounded-full text-[18px] font-bold">
                  {viewer.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={resolveMediaUrl(viewer.profilePic) ?? ""}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    initialsOf(viewer.fullName ?? "?")
                  )}
                </span>
                <span className="bg-base text-azure absolute end-0 bottom-0 flex size-7 items-center justify-center rounded-full text-[26px] leading-none font-bold">
                  <Plus className="size-4" strokeWidth={3} aria-hidden />
                </span>
              </span>
              <span className="text-ink-secondary w-24 truncate text-center text-[12px] font-medium">
                {t("yourStory")}
              </span>
            </Link>
          )}

          {others.map((group) => {
            const name =
              group.user?.username ?? group.user?.fullName ?? t("someone");
            const avatar = resolveMediaUrl(
              group.authorPhotoUrl ?? group.user?.profilePic,
            );
            return (
              <Link
                key={group.userId}
                href={`/stories/${group.userId}`}
                className="flex w-24 shrink-0 flex-col items-center gap-2"
              >
                <span
                  className={`flex size-24 items-center justify-center rounded-full ${
                    group.hasUnseen ?? true ? "border-aqua border-[3px]" : ""
                  }`}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={avatar}
                      alt=""
                      className="size-[86px] rounded-full object-cover"
                    />
                  ) : (
                    <span className="bg-fill-100 text-ink-secondary flex size-[86px] items-center justify-center rounded-full text-[18px] font-semibold">
                      {initialsOf(group.user?.fullName ?? name)}
                    </span>
                  )}
                </span>
                <span
                  className="text-ink-secondary w-24 truncate text-center text-[12px] font-medium"
                  dir="auto"
                >
                  {name}
                </span>
              </Link>
            );
          })}
        </div>

        <h2 className="text-ink mt-10 text-[18px] font-bold">
          {t("latestTitle")}
        </h2>

        {latest.length === 0 ? (
          <p className="text-ink-secondary border-line mt-6 rounded-16 border border-dashed p-14 text-center text-[13px]">
            {t("hubEmpty")}
          </p>
        ) : (
          /* story — 651:2077 */
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {latest.map((group) => {
              const name =
                group.user?.username ?? group.user?.fullName ?? t("someone");
              const cover = resolveMediaUrl(group.latestStory?.mediaUrl);
              const avatar = resolveMediaUrl(
                group.authorPhotoUrl ?? group.user?.profilePic,
              );
              return (
                <Link
                  key={group.userId}
                  href={`/stories/${group.userId}`}
                  className="bg-tint relative block h-[300px] overflow-hidden rounded-16"
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={cover}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span
                    className={`absolute start-3 top-3 flex size-9 items-center justify-center overflow-hidden rounded-full ${
                      group.hasUnseen ?? true
                        ? "border-aqua border-2"
                        : "border-base border-2"
                    }`}
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={avatar}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="bg-fill-100 text-ink-secondary flex size-full items-center justify-center text-[10px] font-semibold">
                        {initialsOf(group.user?.fullName ?? name)}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-base absolute start-3 bottom-3 max-w-[152px] truncate text-[12px] font-semibold drop-shadow"
                    dir="auto"
                  >
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

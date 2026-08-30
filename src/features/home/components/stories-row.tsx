"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Horizontally scrolling story rail — Figma `651:768`.
 *
 * The ring is the design's seen/unseen signal and is now real: an author with
 * something unwatched gets the aqua ring and an ink-900 label; one you've
 * watched through gets no ring and a muted label (GAP-30). Before `hasUnseen`
 * existed every ring was drawn unseen, which made it decoration.
 *
 * Client-side only for the scroll button; the circles themselves are plain
 * links, so the rail works (and is crawlable) without JavaScript.
 */
export interface StoryRingItem {
  userId: string;
  label: string;
  avatarUrl: string | null;
  initials: string;
  hasUnseen: boolean;
}

export function StoriesRow({
  items,
  yourStory,
  nextLabel,
}: {
  items: StoryRingItem[];
  yourStory: {
    label: string;
    avatarUrl: string | null;
    initials: string;
    /** Null when the viewer has posted nothing — nowhere to send them yet. */
    href: string | null;
  } | null;
  nextLabel: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollNext() {
    // Roughly one "page" of circles, and direction-aware: in RTL the content
    // scrolls toward negative offsets, so the sign has to flip.
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-5">
      <div
        ref={scroller}
        className="scrollbar-none flex flex-1 items-start gap-5 overflow-x-auto scroll-smooth"
      >
        {/* YS — 651:769 */}
        {yourStory && (
          <YourStory
            href={yourStory.href}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative block size-[68px]">
              <span className="bg-fill-100 text-action absolute top-0 left-0 flex size-16 items-center justify-center overflow-hidden rounded-full text-[18px] font-bold">
                {yourStory.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={yourStory.avatarUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  yourStory.initials
                )}
              </span>
              {/* Plus — 651:773 */}
              <span className="bg-aqua absolute top-[44px] left-[44px] flex size-[22px] items-center justify-center rounded-full text-[13px] leading-none font-bold text-black">
                +
              </span>
            </span>
            <span className="text-ink-700 w-full truncate text-center text-[10px] font-medium">
              {yourStory.label}
            </span>
          </YourStory>
        )}

        {items.map((item) => (
          <Link
            key={item.userId}
            href={`/stories/${item.userId}`}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            {/* Ring — 651:777 unseen, 651:790 seen */}
            <span
              className={`flex size-[66px] items-center justify-center rounded-full ${
                item.hasUnseen ? "border-aqua border-[2.5px]" : ""
              }`}
            >
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={item.avatarUrl}
                  alt=""
                  className="size-[60px] rounded-full object-cover"
                />
              ) : (
                <span className="bg-fill-100 text-ink-secondary flex size-[60px] items-center justify-center rounded-full text-[13px] font-semibold">
                  {item.initials}
                </span>
              )}
            </span>
            <span
              className={`w-full truncate text-center text-[10px] ${
                item.hasUnseen ? "text-ink-900" : "text-ink-400"
              }`}
              dir="auto"
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Arrow — 651:822 */}
      <button
        type="button"
        onClick={scrollNext}
        aria-label={nextLabel}
        className="bg-fill-100 text-ink-700 hidden size-8 shrink-0 items-center justify-center rounded-[16px] text-[14px] font-bold sm:flex"
      >
        <span aria-hidden className="rtl:-scale-x-100">
          &gt;
        </span>
      </button>
    </div>
  );
}

/** A link when there's a story to open, a plain label when there isn't. */
function YourStory({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

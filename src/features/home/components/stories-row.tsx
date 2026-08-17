"use client";

import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Horizontally scrolling story rail — Figma node 651:768.
 *
 * Client-side only for the scroll button; the circles themselves are plain
 * links, so the rail works (and is crawlable) without JavaScript.
 */
export interface StoryRingItem {
  userId: string;
  label: string;
  avatarUrl: string | null;
  initials: string;
}

export function StoriesRow({
  items,
  yourStory,
  nextLabel,
}: {
  items: StoryRingItem[];
  yourStory: { label: string; avatarUrl: string | null; initials: string } | null;
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
    <div className="relative flex items-start gap-3">
      <div
        ref={scroller}
        className="scrollbar-none flex flex-1 gap-5 overflow-x-auto scroll-smooth"
      >
        {yourStory && (
          <Link
            href="/stories"
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative block">
              <span className="bg-action-tint text-action flex size-14 items-center justify-center rounded-full text-[15px] font-bold">
                {yourStory.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={yourStory.avatarUrl}
                    alt=""
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  yourStory.initials
                )}
              </span>
              {/* The "add a story" affordance from the design. */}
              <span className="bg-action border-base absolute end-0 bottom-0 flex size-5 items-center justify-center rounded-full border-2 text-[13px] leading-none font-bold text-white">
                +
              </span>
            </span>
            <span className="text-ink-tertiary w-full truncate text-center text-[10px]">
              {yourStory.label}
            </span>
          </Link>
        )}

        {items.map((item) => (
          <Link
            key={item.userId}
            href={`/stories/${item.userId}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            {/*
              Every ring is shown "unseen". The API exposes no seen/viewed state
              on a story, so the design's ring vs. no-ring distinction can't be
              driven by data — see GAP-30.
            */}
            <span className="border-aqua block rounded-full border-2 p-0.5">
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={item.avatarUrl}
                  alt=""
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <span className="bg-tint text-ink-secondary flex size-12 items-center justify-center rounded-full text-[13px] font-semibold">
                  {item.initials}
                </span>
              )}
            </span>
            <span className="text-ink-tertiary w-full truncate text-center text-[10px]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={scrollNext}
        aria-label={nextLabel}
        className="border-line bg-base text-ink-secondary hover:text-ink mt-2 hidden size-8 shrink-0 items-center justify-center rounded-full border sm:flex"
      >
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </button>
    </div>
  );
}

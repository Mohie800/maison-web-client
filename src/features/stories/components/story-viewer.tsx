"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import { formatRelative } from "@/lib/format/date";
import type { StoryView } from "../data";
import type { Locale } from "@/i18n/routing";

/**
 * Story viewer — Figma `651:2122` (Web_StoriesViewer).
 *
 * A story, not a page: it fills the viewport, advances itself, and closes back
 * to wherever it was opened from. The frame is full-bleed dark with no site
 * chrome, which is why neither route that renders it sits under the storefront
 * layout.
 *
 * Advancing within an author is client state, not navigation — all of that
 * author's slides arrive in one payload, so a tap shouldn't cost a round trip.
 * Crossing to another author does navigate, because that's a different payload.
 *
 * The prev/next controls are still real links to `?i=`, and the click handler
 * only preempts them. Without JavaScript the viewer degrades to what it was
 * before: one server-rendered slide per URL, paged by hand.
 *
 * Callers key this on the author and start index, so landing on a different
 * author remounts rather than trying to reconcile a stale slide index.
 *
 * The dark chrome (#1a1a2e / #1a1a1a / #2d2d3a) is literal from the frame
 * rather than tokenised: a media viewer is dark in both themes, and these
 * values exist nowhere else in the design system.
 */

/** How long a slide holds before advancing. */
const SLIDE_MS = 5000;

export function StoryViewer({
  view,
  mode,
}: {
  view: StoryView;
  /** `modal` closes back to the opener; `page` is a direct load or refresh. */
  mode: "modal" | "page";
}) {
  const t = useTranslations("Stories");
  const tListing = useTranslations("Listing");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [index, setIndex] = useState(view.startIndex);
  const [paused, setPaused] = useState(false);
  const slide = view.slides[index];

  const close = useCallback(() => {
    if (mode === "modal") router.back();
    else router.push("/");
  }, [mode, router]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    } else if (view.prevAuthorId) {
      router.replace(`/stories/${view.prevAuthorId}`);
    }
  }, [index, view.prevAuthorId, router]);

  const goNext = useCallback(() => {
    if (index < view.slides.length - 1) {
      setIndex(index + 1);
    } else if (view.nextAuthorId) {
      router.replace(`/stories/${view.nextAuthorId}`);
    } else {
      close();
    }
  }, [index, view.slides.length, view.nextAuthorId, router, close]);

  /* Auto-advance. Restarts on every slide, and holds while pressed. */
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(goNext, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, goNext]);

  /* Keyboard: the same three keys every story viewer uses. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goNext, goPrev]);

  /* The page behind a modal must not scroll under it. */
  useEffect(() => {
    if (mode !== "modal") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  /**
   * Marks the slide watched — `POST /stories/{id}/view` (GAP-30).
   *
   * Fire-and-forget: the ring on the home page dims on the next load, and a
   * failed call costs nothing visible. Idempotent server-side. Goes through
   * `/api/proxy` because the session cookies are httpOnly. Skipped when signed
   * out — a view belongs to an account (GAP-52).
   */
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!view.signedIn) return;
    if (!slide || seen.current.has(slide.id)) return;
    seen.current.add(slide.id);
    const controller = new AbortController();
    void fetch(`/api/proxy/stories/${slide.id}/view`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [slide, view.signedIn]);

  if (!slide) return null;

  const prevHref =
    index > 0
      ? `/stories/${view.authorId}?i=${index - 1}`
      : view.prevAuthorId
        ? `/stories/${view.prevAuthorId}`
        : null;
  const nextHref =
    index < view.slides.length - 1
      ? `/stories/${view.authorId}?i=${index + 1}`
      : view.nextAuthorId
        ? `/stories/${view.nextAuthorId}`
        : null;

  const listing = slide.listing;

  return (
    <div
      className={`flex items-center justify-center bg-[#1a1a2e] ${
        mode === "modal" ? "fixed inset-0 z-50" : "h-dvh overflow-hidden"
      }`}
      role={mode === "modal" ? "dialog" : undefined}
      aria-modal={mode === "modal" ? true : undefined}
      aria-label={t("viewerLabel", { name: view.authorName })}
    >
      {/* Backdrop: anywhere outside the card closes, as a story does. */}
      <button
        type="button"
        onClick={close}
        aria-label={t("close")}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      {/* LeftPrev / RightPrev — 651:2160, 651:2161 */}
      {view.prevAuthorId && (
        <Link
          href={`/stories/${view.prevAuthorId}`}
          aria-label={t("previousAuthor")}
          className="absolute start-[210px] top-1/2 hidden h-[680px] w-[280px] -translate-y-1/2 rounded-16 bg-[rgba(26,26,46,0.6)] xl:block"
        />
      )}
      {view.nextAuthorId && (
        <Link
          href={`/stories/${view.nextAuthorId}`}
          aria-label={t("nextAuthor")}
          className="absolute end-[210px] top-1/2 hidden h-[680px] w-[280px] -translate-y-1/2 rounded-16 bg-[rgba(26,26,46,0.6)] xl:block"
        />
      )}

      {/* Prev / Next — 651:2124, 651:2126 */}
      {prevHref && (
        <Link
          href={prevHref}
          onClick={(event) => {
            event.preventDefault();
            goPrev();
          }}
          aria-label={t("previous")}
          className="absolute start-10 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a1a2e] sm:flex"
        >
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
      )}
      {nextHref && (
        <Link
          href={nextHref}
          onClick={(event) => {
            event.preventDefault();
            goNext();
          }}
          aria-label={t("next")}
          className="absolute end-10 top-1/2 z-20 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1a1a2e] sm:flex"
        >
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
      )}

      {/* StoryCard — 651:2128 */}
      <article className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-[#1a1a1a] sm:h-[820px] sm:max-h-[100dvh] sm:w-[420px] sm:max-w-full sm:rounded-[24px]">
        <div className="relative flex flex-1 flex-col items-center bg-[#2d2d3a]">
          {/*
            ProdImg — 651:2130. The frame's 320px square is a desktop
            composition; on a phone the media is the story, so it fills the
            slide edge to edge and the overlays sit on top of it.
          */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-[#2d2d3a] sm:static sm:mt-[220px] sm:size-[320px] sm:max-w-full sm:overflow-hidden sm:rounded-16 sm:bg-[#f5f5f0]">
            {slide.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img
                src={slide.mediaUrl}
                alt=""
                className="size-full object-cover"
              />
            )}
          </div>

          {/* Keeps the white progress bar, name and caption legible on top of
              a full-bleed photo. Nothing to scrim once the media is framed. */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-transparent to-black/65 sm:hidden"
            aria-hidden
          />

          {/*
            Tap zones, as a story has them: the left third goes back, the rest
            goes forward, and holding pauses. Behind the header and the product
            card so those stay clickable.
          */}
          <div className="absolute inset-0 z-[2] flex">
            <TapZone onClick={goPrev} onHold={setPaused} label={t("previous")} className="w-1/3" />
            <TapZone onClick={goNext} onHold={setPaused} label={t("next")} className="flex-1" />
          </div>

          {/* Progress — 651:2133 */}
          <div className="pointer-events-none absolute inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex h-2 items-center gap-1">
            {view.slides.map((segment, i) => (
              <span
                key={segment.id}
                className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-white/35"
              >
                <span
                  className={`block h-full rounded-[2px] bg-aqua ${
                    i < index
                      ? "w-full"
                      : i === index
                        ? "animate-story-progress"
                        : "w-0"
                  }`}
                  style={
                    i === index
                      ? {
                          animationDuration: `${SLIDE_MS}ms`,
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : undefined
                  }
                />
              </span>
            ))}
          </div>

          {/* UserBar — 651:2139 */}
          <div className="absolute inset-x-4 top-[calc(2rem+env(safe-area-inset-top))] z-10 flex h-11 items-center justify-between">
            <Link
              href={`/sellers/${view.authorId}`}
              className="flex items-center gap-2.5"
            >
              <span className="bg-action-tint size-9 overflow-hidden rounded-full">
                {view.authorAvatar && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={view.authorAvatar}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="flex flex-col gap-px text-white">
                <span className="text-[13px] font-semibold" dir="auto">
                  {view.authorName}
                </span>
                {slide.createdAt && (
                  <span className="text-[10px]">
                    {formatRelative(slide.createdAt, locale)}
                  </span>
                )}
              </span>
            </Link>

            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="flex size-7 items-center justify-center rounded-full bg-white text-[#1a1a2e]"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>

          {/* PromoText — 651:2131 */}
          {slide.caption && (
            <p
              className="pointer-events-none absolute inset-x-0 bottom-8 z-10 px-6 text-center text-[20px] font-bold text-white sm:static sm:mt-[50px]"
              dir="auto"
            >
              {slide.caption}
            </p>
          )}
        </div>

        {/* ProdCard — 651:2148. Only when the story is about a listing. */}
        {listing && (
          <Link
            href={`/products/${listing.id}`}
            className="bg-base relative z-10 flex items-center gap-3 rounded-t-16 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-none sm:pb-4"
          >
            <span className="bg-fill-100 size-[52px] shrink-0 overflow-hidden rounded-10">
              {listing.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={listing.photoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {listing.condition && (
                <span className="bg-action-tint text-action flex h-[18px] w-fit items-center rounded-[9px] px-1.5 text-[9px] font-medium">
                  {tListing(`conditions.${listing.condition}`)}
                </span>
              )}
              <span className="truncate text-[13px] font-semibold" dir="auto">
                {listing.title}
              </span>
              {listing.categoryName && (
                <span className="text-ink-500 truncate text-[11px]" dir="auto">
                  {listing.categoryName}
                </span>
              )}
              <span className="flex items-center gap-1.5" dir="ltr">
                <span className="text-[13px] font-bold">
                  {formatPrice(listing.price, listing.currency)}
                </span>
                {listing.originalPrice && (
                  <span className="text-ink-400 text-[11px] line-through">
                    {formatPrice(listing.originalPrice, listing.currency)}
                  </span>
                )}
              </span>
            </span>
            <span className="bg-aqua flex h-10 shrink-0 items-center rounded-[20px] px-4 text-[12px] font-bold text-black">
              {t("addToBag")}
            </span>
          </Link>
        )}
      </article>
    </div>
  );
}

/** Half the screen, one job. Pointer-down holds the slide, as a story does. */
function TapZone({
  onClick,
  onHold,
  label,
  className,
}: {
  onClick: () => void;
  onHold: (held: boolean) => void;
  label: string;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={() => onHold(true)}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      className={`cursor-default ${className}`}
      tabIndex={-1}
    />
  );
}

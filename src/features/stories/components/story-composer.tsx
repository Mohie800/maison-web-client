"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  STORY_CAPTION_MAX,
  STORY_DURATIONS,
  STORY_VISIBILITIES,
  type StoryDuration,
  type StoryVisibility,
} from "@/lib/api/schemas/cards";
import { createStoryAction, uploadStoryMediaAction } from "../actions";

/**
 * Add to Your Story — `651:2162` (Choose), `651:2210` (Edit), `651:2276`
 * (Preview & Post).
 *
 * Drawn as a modal over the stories hub; here it is a route, so a refreshed or
 * shared link lands on the composer rather than an empty overlay — the same
 * call the trade offer builder makes.
 *
 * One client component rather than three routes because the middle of it is a
 * picked file, which no query string can carry across a navigation.
 *
 * Two of the Choose step's three rows are drawn. Video and the Promotion story
 * kind have nothing to write to — the uploader and the row are image-only and
 * there is no story type — so they are left out rather than offered and
 * silently dropped (GAP-90, plans/09).
 */

export interface ComposerListing {
  id: string;
  title: string;
  price: string;
  condition: string | null;
  /** Resolved, for the tile and the preview. */
  photoUrl: string | null;
  /** The raw `/uploads/…` path, which is what `POST /stories` is sent. */
  photoPath: string | null;
}

type Step = 1 | 2 | 3;
type Source = "upload" | "listing";

export interface ComposerLabels {
  titles: Record<Step, string>;
  steps: { choose: string; edit: string; preview: string };
  close: string;
  question: string;
  upload: { title: string; body: string; cta: string };
  fromListing: { title: string; body: string; cta: string };
  caption: string;
  captionPlaceholder: string;
  linkProduct: string;
  linkNone: string;
  duration: string;
  durationOption: string;
  audience: string;
  audienceOption: Record<StoryVisibility, string>;
  next: string;
  ready: string;
  summary: string;
  edit: string;
  back: string;
  post: string;
  posting: string;
  addToBag: string;
  noListings: string;
  errors: Record<string, string>;
}

export function StoryComposer({
  listings,
  labels,
}: {
  listings: ComposerListing[];
  labels: ComposerLabels;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>("upload");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [listingId, setListingId] = useState("");
  const [durationHours, setDurationHours] = useState<StoryDuration>(24);
  const [visibility, setVisibility] = useState<StoryVisibility>("everyone");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const listing = listings.find((item) => item.id === listingId) ?? null;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    const body = new FormData();
    body.set("file", file);
    startTransition(async () => {
      const result = await uploadStoryMediaAction(body);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setSource("upload");
      setMediaUrl(result.url);
      setStep(2);
    });
  };

  const pickListing = (item: ComposerListing) => {
    if (!item.photoPath) return;
    setError(null);
    setSource("listing");
    setMediaUrl(item.photoPath);
    setPreview(item.photoUrl);
    setListingId(item.id);
    setStep(2);
  };

  const post = () => {
    if (!mediaUrl) return;
    startTransition(async () => {
      const result = await createStoryAction({
        mediaUrl,
        caption,
        listingId: listingId || null,
        durationHours,
        visibility,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/stories");
      router.refresh();
    });
  };

  return (
    /* 01_AddStory_Choose — 651:2162 */
    <div className="bg-base border-line-200 flex w-full max-w-[720px] flex-col overflow-hidden rounded-20 border">
      {/* Hdr — 651:2163 */}
      <div className="flex items-center justify-between px-4 py-5 sm:px-6">
        <h1 className="text-ink-900 text-[18px] font-bold">
          {labels.titles[step]}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/stories")}
          aria-label={labels.close}
          className="bg-fill-100 text-ink-700 flex size-8 items-center justify-center rounded-16 text-[14px] font-bold"
        >
          ×
        </button>
      </div>
      <span className="bg-fill-100 h-px w-full" aria-hidden />

      {/* Progress — 651:2168 */}
      <div className="flex items-center gap-1.5 px-4 py-4 sm:gap-2 sm:px-6">
        {([1, 2, 3] as Step[]).map((index) => (
          <div key={index} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {index > 1 && (
              <span
                className={`h-[2px] w-4 shrink sm:w-10 ${
                  step >= index ? "bg-ink-900" : "bg-line-200"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`flex size-7 items-center justify-center rounded-[14px] text-[12px] font-bold ${
                step === index
                  ? "bg-aqua text-black"
                  : step > index
                    ? "bg-ink-900 text-base"
                    : "bg-fill-100 text-ink-400"
              }`}
            >
              {index}
            </span>
            <span
              className={`truncate text-[12px] ${
                step === index
                  ? "text-ink-900 font-semibold"
                  : "text-ink-400"
              }`}
            >
              {index === 1
                ? labels.steps.choose
                : index === 2
                  ? labels.steps.edit
                  : labels.steps.preview}
            </span>
          </div>
        ))}
      </div>
      <span className="bg-fill-100 h-px w-full" aria-hidden />

      {error && (
        <p className="bg-error-tint text-error mx-6 mt-4 rounded-10 p-3 text-[13px]">
          {labels.errors[error] ?? labels.errors.requestFailed}
        </p>
      )}

      {step === 1 && (
        /* Body — 651:2184 */
        <div className="flex flex-col gap-4 p-6">
          <p className="text-ink-900 text-[15px] font-semibold">
            {labels.question}
          </p>

          {/* Opt — 651:2186 */}
          <div className="bg-fill-50 border-line-200 flex items-center gap-3.5 rounded-12 border p-4">
            <span className="bg-action-tint text-action flex size-11 items-center justify-center rounded-[22px] text-[13px] font-bold">
              UP
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-ink-900 text-[14px] font-semibold">
                {labels.upload.title}
              </span>
              <span className="text-ink-500 text-[12px]">
                {labels.upload.body}
              </span>
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="bg-aqua flex h-9 shrink-0 items-center justify-center rounded-[18px] px-4 text-[12px] font-bold text-black disabled:opacity-60"
            >
              {labels.upload.cta}
            </button>
          </div>

          {/* Opt — 651:2194 */}
          <div className="bg-fill-50 border-line-200 flex flex-col gap-3.5 rounded-12 border p-4">
            <div className="flex items-center gap-3.5">
              <span className="bg-info-tint text-info flex size-11 items-center justify-center rounded-[22px] text-[13px] font-bold">
                PR
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-ink-900 text-[14px] font-semibold">
                  {labels.fromListing.title}
                </span>
                <span className="text-ink-500 text-[12px]">
                  {labels.fromListing.body}
                </span>
              </span>
            </div>

            {listings.length === 0 ? (
              <p className="text-ink-400 text-[12px]">{labels.noListings}</p>
            ) : (
              <div className="scrollbar-none flex gap-3 overflow-x-auto">
                {listings.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickListing(item)}
                    disabled={!item.photoUrl || busy}
                    className="border-line-200 bg-base flex w-[128px] shrink-0 flex-col gap-1.5 rounded-10 border p-2 text-start disabled:opacity-50"
                  >
                    <span className="bg-fill-100 block h-[96px] w-full overflow-hidden rounded-8">
                      {item.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                        <img
                          src={item.photoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                    </span>
                    <span
                      className="text-ink-900 line-clamp-2 text-[11px] font-semibold"
                      dir="auto"
                    >
                      {item.title}
                    </span>
                    <span className="text-action text-[11px] font-bold">
                      {item.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        /* Body2 — 651:2232 */
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start">
          <StoryPreview
            className="h-[480px] w-full shrink-0 rounded-16 py-4 lg:w-[280px]"
            mediaClassName="h-[280px] w-[248px]"
            width="w-[248px]"
            captionClass="text-[15px]"
            preview={preview}
            caption={caption}
            listing={listing}
            addToBag={labels.addToBag}
          />

          {/* Ctrl — 651:2249 */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="story-caption"
                className="text-ink-700 text-[12px] font-medium"
              >
                {labels.caption}
              </label>
              <input
                id="story-caption"
                value={caption}
                maxLength={STORY_CAPTION_MAX}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={labels.captionPlaceholder}
                dir="auto"
                className="bg-fill-50 border-line-200 text-ink-900 placeholder:text-ink-400 h-11 w-full rounded-8 border ps-3.5 text-[13px] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="story-listing"
                className="text-ink-700 text-[12px] font-medium"
              >
                {labels.linkProduct}
              </label>
              <select
                id="story-listing"
                value={listingId}
                onChange={(event) => setListingId(event.target.value)}
                disabled={source === "listing"}
                className="bg-fill-50 border-line-200 text-ink-900 h-11 w-full rounded-8 border px-3.5 text-[13px] outline-none disabled:opacity-60"
              >
                <option value="">{labels.linkNone}</option>
                {listings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            {/* DW — 651:2258 */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-ink-700 pb-2 text-[12px] font-medium">
                {labels.duration}
              </legend>
              <div className="flex items-start gap-2">
                {STORY_DURATIONS.map((hours) => (
                  <Chip
                    key={hours}
                    on={durationHours === hours}
                    onClick={() => setDurationHours(hours)}
                    label={labels.durationOption.replace("{hours}", String(hours))}
                  />
                ))}
              </div>
            </fieldset>

            {/* AW — 651:2267 */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-ink-700 pb-2 text-[12px] font-medium">
                {labels.audience}
              </legend>
              <div className="flex items-start gap-2">
                {STORY_VISIBILITIES.map((option) => (
                  <Chip
                    key={option}
                    on={visibility === option}
                    onClick={() => setVisibility(option)}
                    label={labels.audienceOption[option]}
                  />
                ))}
              </div>
            </fieldset>

            {/* Next — 651:2274 */}
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!mediaUrl}
              className="bg-aqua h-12 w-full rounded-[24px] text-[14px] font-bold text-black disabled:opacity-60"
            >
              {labels.next}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        /* Body3 — 651:2298 */
        <div className="flex flex-col items-center gap-5 p-6">
          <p className="text-ink-900 text-[16px] font-semibold">
            {labels.ready}
          </p>

          <StoryPreview
            className="h-[560px] w-full max-w-[340px] rounded-20 py-3.5"
            mediaClassName="h-[340px] w-[300px]"
            width="w-[300px]"
            captionClass="text-[17px]"
            preview={preview}
            caption={caption}
            listing={listing}
            addToBag={labels.addToBag}
          />

          {/* Sum — 651:2316 */}
          <div className="bg-fill-50 border-line-200 flex w-full items-start justify-between rounded-10 border px-4 py-3 text-[12px]">
            <span className="text-ink-500">
              {labels.summary
                .replace("{hours}", String(durationHours))
                .replace("{audience}", labels.audienceOption[visibility])}
            </span>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-action font-medium"
            >
              {labels.edit}
            </button>
          </div>

          {/* CTA — 651:2319 */}
          <div className="flex w-full items-start gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="border-line-200 text-ink-700 h-12 flex-1 rounded-[24px] border text-[14px] font-medium"
            >
              {labels.back}
            </button>
            <button
              type="button"
              onClick={post}
              disabled={busy || !mediaUrl}
              className="bg-aqua h-12 flex-1 rounded-[24px] text-[14px] font-bold text-black disabled:opacity-60"
            >
              {busy ? labels.posting : labels.post}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-9 flex-1 rounded-[18px] text-[11px] ${
        on ? "bg-aqua font-bold text-black" : "bg-fill-100 text-ink-700"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * The phone the frame draws twice, at 280/480 on Edit and 340/560 on Preview.
 * `#1a1a2e` and the slate media well are fixed chrome, as in the story viewer —
 * a story is the same colour in either theme.
 */
function StoryPreview({
  className,
  mediaClassName,
  width,
  captionClass,
  preview,
  caption,
  listing,
  addToBag,
}: {
  className: string;
  mediaClassName: string;
  width: string;
  captionClass: string;
  preview: string | null;
  caption: string;
  listing: ComposerListing | null;
  addToBag: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 bg-[#1a1a2e] ${className}`}
    >
      {/* PBars — 651:2234 */}
      <div className={`flex h-1 items-start gap-[3px] ${width}`} aria-hidden>
        <span className="bg-aqua h-1 flex-1 rounded-[2px]" />
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className="h-1 flex-1 rounded-[2px] bg-white" />
        ))}
      </div>

      <div
        className={`flex items-center justify-center overflow-hidden rounded-12 bg-[#2d3748] ${mediaClassName}`}
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: preview
          <img src={preview} alt="" className="size-full object-cover" />
        )}
      </div>

      {caption && (
        <p
          className={`px-4 text-center font-bold text-white ${captionClass}`}
          dir="auto"
        >
          {caption}
        </p>
      )}

      {listing && (
        /* PCard — 651:2243 */
        <div
          className={`flex h-14 items-center gap-2 rounded-10 bg-white px-2.5 ${width}`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[11px]">
            <span className="truncate font-semibold text-[#111827]" dir="auto">
              {listing.title}
            </span>
            <span className="font-bold text-[#059669]">{listing.price}</span>
          </span>
          <span className="bg-aqua flex h-[30px] shrink-0 items-center justify-center rounded-[15px] px-2.5 text-[9px] font-bold text-black">
            {addToBag}
          </span>
        </div>
      )}
    </div>
  );
}

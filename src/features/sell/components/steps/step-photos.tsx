"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { PHOTOS_MAX, PHOTOS_MIN, type SellDraft } from "../../draft";

/**
 * Step 5 — Figma `651:5687` (Web_Sell_5_Photos): one 300×220 cover tile and a
 * 2×2 grid of 150×100 tiles.
 *
 * The frame draws exactly five slots, which happens to be the API's real
 * ceiling — `CreateListingDto.imagesBase64` takes at most 5. The frame's own
 * copy says "up to 8" and `POST /listings/{id}/photos` says 10; five is what
 * can actually be sent (GAP-74), so the copy reads five.
 *
 * Files are read to data URIs in the browser because that is what the API
 * accepts; there is no upload endpoint to post a file to.
 */
const MAX_BYTES = 5 * 1024 * 1024;

export function StepPhotos({
  draft,
  onChange,
  labels,
}: {
  draft: SellDraft;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: {
    addCover: string;
    tip: string;
    remove: string;
    needMore: (min: number) => string;
    tooLarge: string;
  };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = PHOTOS_MAX - draft.photos.length;
    const chosen = Array.from(files).slice(0, room);

    const read = await Promise.all(
      chosen.map(
        (file) =>
          new Promise<string | null>((resolve) => {
            if (file.size > MAX_BYTES) return resolve(null);
            const reader = new FileReader();
            reader.onload = () =>
              resolve(
                typeof reader.result === "string" ? reader.result : null,
              );
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }),
      ),
    );

    if (read.some((each) => each === null)) setError(labels.tooLarge);
    const kept = read.filter((each): each is string => Boolean(each));
    if (kept.length) onChange({ photos: [...draft.photos, ...kept] });
    if (input.current) input.current.value = "";
  };

  const removeAt = (index: number) =>
    onChange({ photos: draft.photos.filter((_, each) => each !== index) });

  const [cover, ...rest] = draft.photos;
  const emptySlots = Math.max(0, PHOTOS_MAX - 1 - rest.length);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => add(event.target.files)}
        className="sr-only"
      />

      <div className="flex flex-wrap gap-6">
        {/* cover — 651:5689 */}
        <Tile
          size="cover"
          photo={cover}
          label={labels.addCover}
          removeLabel={labels.remove}
          onAdd={() => input.current?.click()}
          onRemove={() => removeAt(0)}
        />

        {/* 651:5691 — the 2×2 grid */}
        <div className="grid grid-cols-2 gap-4">
          {rest.map((photo, index) => (
            <Tile
              key={photo.slice(-24) + index}
              size="small"
              photo={photo}
              label="+"
              removeLabel={labels.remove}
              onAdd={() => input.current?.click()}
              onRemove={() => removeAt(index + 1)}
            />
          ))}
          {Array.from({ length: emptySlots }, (_, index) => (
            <Tile
              key={`empty-${index}`}
              size="small"
              photo={undefined}
              label="+"
              removeLabel={labels.remove}
              onAdd={() => input.current?.click()}
              onRemove={() => undefined}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-error text-[12px] font-medium" role="alert">
          {error}
        </p>
      )}
      {draft.photos.length > 0 && draft.photos.length < PHOTOS_MIN && (
        <p className="text-ink-tertiary text-[12px]">
          {labels.needMore(PHOTOS_MIN)}
        </p>
      )}

      {/* 651:5699 */}
      <p className="text-ink-tertiary text-[12px]">{labels.tip}</p>
    </>
  );
}

function Tile({
  size,
  photo,
  label,
  removeLabel,
  onAdd,
  onRemove,
}: {
  size: "cover" | "small";
  photo: string | undefined;
  label: string;
  removeLabel: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const box =
    size === "cover"
      ? "h-[220px] w-[300px] rounded-16"
      : "h-[100px] w-[150px] rounded-12";

  if (photo) {
    return (
      <div className={`relative overflow-hidden ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12 */}
        <img src={photo} alt="" className="size-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className={`bg-surface border-line flex items-center justify-center border-[1.5px] border-dashed ${box} ${
        size === "cover"
          ? "text-azure text-[14px] font-semibold"
          : "text-ink-tertiary text-[22px] font-bold"
      }`}
    >
      {label}
    </button>
  );
}

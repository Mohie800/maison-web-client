"use client";

import { useState } from "react";

/**
 * Reason radios, the note, and the photo block — Figma `651:8524`–`651:8556`.
 *
 * Client-side for one reason: three of the six reasons require photo evidence,
 * so picking one has to reveal the four upload tiles and hold the submit until
 * at least one file is chosen. The tiles are plain file inputs posted with the
 * form, so the flow still works with the script off — the Server Action does
 * the same check, and `POST /media` turns each file into a URL (GAP-72).
 */
export function ReturnReasonPicker({
  reasons,
  chargesShipping,
  labels,
  noteMax,
}: {
  reasons: {
    value: string;
    label: string;
    needsPhotos: boolean;
    waivesShipping: boolean;
  }[];
  /** False when the API charges no return shipping at all. */
  chargesShipping: boolean;
  labels: Record<
    | "legend"
    | "describe"
    | "placeholder"
    | "noteLimit"
    | "photosLegend"
    | "photosRequired"
    | "submit"
    | "footnote"
    | "shippingFee"
    | "shippingWaived",
    string
  >;
  noteMax: number;
}) {
  const [selected, setSelected] = useState<string>("");
  const [photos, setPhotos] = useState<(File | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const chosen = reasons.find((reason) => reason.value === selected);
  const needsPhotos = chosen?.needsPhotos === true;
  const photoCount = photos.filter(Boolean).length;
  /* A fault reason with no evidence is the one thing the API will refuse. */
  const blocked = needsPhotos && photoCount === 0;

  return (
    <>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[13px] font-semibold">
          {labels.legend}
        </legend>
        {reasons.map((reason) => {
          const on = selected === reason.value;
          return (
            <label
              key={reason.value}
              className={`flex cursor-pointer items-center gap-3 rounded-10 px-3.5 py-3 text-[13px] ${
                on
                  ? "bg-success-tint border-action text-action border-[1.5px]"
                  : "bg-base border-line text-ink-700 border"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={reason.value}
                checked={on}
                onChange={() => setSelected(reason.value)}
                className="accent-action size-[18px] shrink-0"
              />
              {reason.label}
            </label>
          );
        })}
        {/* What the reason costs, stated before it is picked (GAP-94). */}
        {chargesShipping && (
          <p className="text-ink-tertiary text-[12px]">
            {chosen?.waivesShipping
              ? labels.shippingWaived
              : labels.shippingFee}
          </p>
        )}
      </fieldset>

      {/* DW — 651:8542 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">{labels.describe}</span>
        <textarea
          name="reasonNote"
          rows={4}
          maxLength={noteMax}
          placeholder={labels.placeholder}
          dir="auto"
          className="bg-fill-50 border-line text-ink-700 min-h-[100px] rounded-8 border px-3.5 py-3 text-[13px] outline-none"
        />
        <span className="text-ink-tertiary text-[11px]">
          {labels.noteLimit}
        </span>
      </label>

      {/* PW — 651:8546. Four tiles, as the frame draws; only fault reasons need them. */}
      {needsPhotos && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-semibold">{labels.photosLegend}</p>
          <div className="flex gap-3">
            {photos.map((file, index) => (
              <label
                key={index}
                className={`flex h-20 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-10 border px-2 text-center ${
                  file
                    ? "bg-success-tint border-action text-action text-[11px] font-medium"
                    : "bg-fill-50 border-line text-ink-400 text-[18px] font-bold"
                }`}
              >
                {file ? (
                  <span className="line-clamp-3 break-all">{file.name}</span>
                ) : (
                  "+"
                )}
                <input
                  type="file"
                  name="evidencePhotos"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setPhotos((current) => {
                      const next = [...current];
                      next[index] = event.target.files?.[0] ?? null;
                      return next;
                    })
                  }
                />
              </label>
            ))}
          </div>
          {blocked && (
            <p className="text-ink-tertiary text-[12px]">
              {labels.photosRequired}
            </p>
          )}
        </div>
      )}

      {/* Submit — 651:8566. Owned by this component so a fault reason can
          disable it, rather than posting something the API will reject. */}
      <button
        type="submit"
        disabled={blocked}
        className="bg-aqua flex h-13 items-center justify-center rounded-[26px] text-[15px] font-bold text-black disabled:opacity-50"
      >
        {labels.submit}
      </button>
      <p className="text-ink-tertiary text-[12px]">{labels.footnote}</p>
    </>
  );
}

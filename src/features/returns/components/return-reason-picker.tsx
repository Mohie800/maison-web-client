"use client";

import { useState } from "react";

/**
 * Reason radios, the note, and the photo block — Figma `651:8524`–`651:8556`.
 *
 * Client-side for one reason: three of the six reasons require photo evidence
 * the API gives us no way to upload (GAP-72), so picking one has to swap the
 * upload row for an explanation and disable the submit. Everything else is a
 * plain radio group and a textarea, and works without JavaScript — with the
 * script off, a fault reason is caught by the Server Action instead.
 */
export function ReturnReasonPicker({
  reasons,
  labels,
  contactHref,
  noteMax,
}: {
  reasons: { value: string; label: string; needsPhotos: boolean }[];
  labels: Record<
    | "legend"
    | "describe"
    | "placeholder"
    | "noteLimit"
    | "photosLegend"
    | "photosBlocked"
    | "contact"
    | "submit"
    | "footnote",
    string
  >;
  contactHref: string;
  noteMax: number;
}) {
  const [selected, setSelected] = useState<string>("");
  const chosen = reasons.find((reason) => reason.value === selected);
  const blocked = chosen?.needsPhotos === true;

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

      {/* PW — 651:8546. Only fault reasons need evidence, and none can be sent. */}
      {blocked && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-semibold">{labels.photosLegend}</p>
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <span
                key={index}
                className="bg-fill-50 border-line text-ink-400 flex h-20 flex-1 items-center justify-center rounded-10 border text-[18px] font-bold opacity-60"
                aria-hidden
              >
                +
              </span>
            ))}
          </div>
          <p className="bg-warn-tint2 border-gold text-amber-text rounded-10 border px-3.5 py-2.5 text-[12px]">
            {labels.photosBlocked}{" "}
            <a href={contactHref} className="font-semibold underline">
              {labels.contact}
            </a>
          </p>
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

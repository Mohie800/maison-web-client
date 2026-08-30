"use client";

import { useState } from "react";
import { RATING_MAX } from "@/lib/api/schemas/review";

/**
 * The overall rating row — Figma `651:8719`–`651:8729`.
 *
 * Radio inputs under the stars, so the control is keyboard-operable, works in
 * a plain form post, and reads correctly to a screen reader; the circles are
 * the label. The word beside them ("Very good") changes with the selection,
 * which is the only reason this needs a client component.
 */
export function StarRatingInput({
  labels,
  legend,
}: {
  /** Five words, worst to best. */
  labels: string[];
  legend: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-semibold">{legend}</legend>
      <div className="flex items-center gap-3">
        <div className="flex gap-3" onMouseLeave={() => setHover(0)}>
          {Array.from({ length: RATING_MAX }, (_, index) => {
            const value = index + 1;
            const on = value <= shown;
            return (
              <label
                key={value}
                onMouseEnter={() => setHover(value)}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-[16px] font-bold ${
                  on ? "bg-gold text-white" : "bg-fill-100 text-ink-tertiary"
                }`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                  aria-label={labels[index]}
                />
                <span aria-hidden>★</span>
              </label>
            );
          })}
        </div>
        <span className="text-[13px] font-semibold" aria-live="polite">
          {shown > 0 ? labels[shown - 1] : ""}
        </span>
      </div>
    </fieldset>
  );
}

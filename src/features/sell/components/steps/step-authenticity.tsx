"use client";

import { VERIFICATION_ITEMS, type SellDraft } from "../../draft";

/**
 * Step 6 — Figma `651:5705` (Web_Sell_6_Authenticity).
 *
 * The frame shows a finished score — "82 / 100", HIGHLY TRUSTED, and four
 * contributions. None of that can exist here: `authenticityScore` is
 * recomputed by `POST /listings/{id}/verification`, which needs a listing, and
 * the listing is not created until step 9 (see draft.ts). The API's input is
 * `verifiedItems`, a checklist of six — which is what the frame's rows are
 * describing from the other side ("Brand tags visible", "Serial / date code",
 * "Original receipt").
 *
 * So this step collects the checklist and says plainly when the score is
 * calculated. Recorded in plans/09 C36.
 */
export function StepAuthenticity({
  draft,
  onChange,
  labels,
  itemLabel,
}: {
  draft: SellDraft;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: { legend: string; scoreLater: string };
  itemLabel: (item: string) => string;
}) {
  const chosen = new Set(draft.verifiedItems);

  const toggle = (item: string) =>
    onChange({
      verifiedItems: chosen.has(item)
        ? draft.verifiedItems.filter((each) => each !== item)
        : [...draft.verifiedItems, item],
    });

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[14px] font-semibold">
          {labels.legend}
        </legend>
        {VERIFICATION_ITEMS.map((item) => {
          const on = chosen.has(item);
          return (
            <label
              key={item}
              className={`bg-base flex cursor-pointer items-center gap-4 rounded-[14px] px-4 py-3.5 ${
                on ? "border-action border-[1.5px]" : "border-line border"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(item)}
                className="accent-action size-[18px] shrink-0"
              />
              <span className="text-[14px] font-medium">{itemLabel(item)}</span>
            </label>
          );
        })}
      </fieldset>

      <p className="text-ink-tertiary text-[12px]">{labels.scoreLater}</p>
    </>
  );
}

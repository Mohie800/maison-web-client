"use client";

import { CONDITIONS, type SellDraft } from "../../draft";
import type { TrackSchema } from "../../types";

/**
 * Step 4 — Figma `651:5609` (Web_Sell_4_Condition): condition rows, then a
 * "Any flaws?" chip row.
 *
 * Both lists come from `GET /lookups/track-schema/{type}`, not from the frame:
 * `allowedConditions` differs per type (Fashion has no plain "new" but does
 * have with/without tags), and the flaw chips are the `defectChecklist`
 * options, which are the codes `POST /listings/{id}/defects` accepts. The
 * frame's five chips — Scuffs, Stains, Missing parts, Repairs, Odor — are a
 * different vocabulary that nothing would store. plans/09 C36.
 */
export function StepCondition({
  draft,
  schema,
  onChange,
  labels,
  conditionLabel,
  defectLabel,
}: {
  draft: SellDraft;
  schema: TrackSchema | null;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: { flaws: string };
  conditionLabel: (value: string) => { title: string; body: string };
  defectLabel: (code: string) => string;
}) {
  const allowed = (
    schema?.allowedConditions?.length ? schema.allowedConditions : CONDITIONS
  ) as readonly string[];

  const defectOptions = schema?.checklist?.defectChecklist?.options ?? [];
  const chosen = new Set(draft.defects.map((defect) => defect.code));

  const toggleDefect = (code: string) =>
    onChange({
      defects: chosen.has(code)
        ? draft.defects.filter((defect) => defect.code !== code)
        : [...draft.defects, { code }],
    });

  return (
    <>
      {/* opt — 651:5610 */}
      <fieldset className="flex flex-col gap-3">
        {allowed.map((value) => {
          const on = draft.condition === value;
          const copy = conditionLabel(value);
          return (
            <label
              key={value}
              className={`bg-base flex cursor-pointer items-center gap-4 rounded-[14px] px-4 py-2.5 ${
                on ? "border-azure border-2" : "border-line border"
              }`}
            >
              <input
                type="radio"
                name="condition"
                checked={on}
                onChange={() =>
                  onChange({
                    condition: value as SellDraft["condition"],
                  })
                }
                className="accent-action size-[22px] shrink-0"
              />
              <span className="flex flex-col">
                <span className="text-[15px] leading-[21px] font-semibold">
                  {copy.title}
                </span>
                <span className="text-ink-secondary text-[13px] leading-[18.2px]">
                  {copy.body}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {/* 651:5626 */}
      {defectOptions.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-[13px] font-semibold">
            {labels.flaws}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {defectOptions.map((code) => {
              const on = chosen.has(code);
              return (
                <label
                  key={code}
                  className={`flex h-[38px] cursor-pointer items-center rounded-[19px] px-3.5 text-[13px] font-semibold ${
                    on
                      ? "bg-aqua text-on-accent"
                      : "bg-surface border-line border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleDefect(code)}
                    className="sr-only"
                  />
                  {defectLabel(code)}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}

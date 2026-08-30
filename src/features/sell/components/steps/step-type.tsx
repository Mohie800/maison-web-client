"use client";

import type { SellDraft } from "../../draft";

/**
 * Step 2 — Figma `651:5223` (Web_Sell_2_Type): three stacked option rows.
 *
 * The frame's three map onto the API as `isNegotiable` / `tradeEnabled` /
 * `auctionEnabled`. The API's fourth state, `negotiable`, has no card here and
 * so cannot be chosen from the wizard — see plans/09 C36.
 */
const OPTIONS = ["sell", "trade", "auction"] as const;
type Option = (typeof OPTIONS)[number];

export function StepType({
  draft,
  onChange,
  labels,
}: {
  draft: SellDraft;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: {
    options: Record<Option, { title: string; body: string }>;
    footnote: string;
  };
}) {
  const selected: Option = draft.tradeEnabled
    ? "trade"
    : draft.saleMode === "auction"
      ? "auction"
      : "sell";

  const pick = (option: Option) =>
    onChange({
      saleMode: option === "auction" ? "auction" : "fixed",
      tradeEnabled: option === "trade",
    });

  return (
    <>
      {/* opt — 651:5225 */}
      <fieldset className="flex flex-col gap-3">
        {OPTIONS.map((option) => {
          const on = selected === option;
          return (
            <label
              key={option}
              className={`bg-base flex cursor-pointer items-center gap-4 rounded-[14px] px-4 py-5 ${
                on ? "border-azure border-2" : "border-line border"
              }`}
            >
              <input
                type="radio"
                name="listingType"
                checked={on}
                onChange={() => pick(option)}
                className="accent-action size-[22px] shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-[21px] font-semibold">
                  {labels.options[option].title}
                </span>
                <span className="text-ink-secondary text-[13px] leading-[18.2px]">
                  {labels.options[option].body}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {/* 651:5237 */}
      <p className="text-ink-tertiary text-[12px]">{labels.footnote}</p>
    </>
  );
}

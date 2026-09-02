"use client";

import { useMemo, useState } from "react";
import { TRADE_PREFERENCES_MAX, type SellDraft } from "../../draft";
import type { SellCategory } from "../../types";

/**
 * Step 2 — Figma `651:5223` (Web_Sell_2_Type): three stacked option rows.
 *
 * The frame's three map onto the API as `isNegotiable` / `tradeEnabled` /
 * `auctionEnabled`. The API's fourth state, `negotiable`, has no card here and
 * so cannot be chosen from the wizard — see plans/09 C36.
 *
 * Picking Trade opens the preference picker below it (GAP-97). It is collected
 * here rather than on a step of its own because the frame has no step for it,
 * and because it is only ever a question for a trade listing.
 */
const OPTIONS = ["sell", "trade", "auction"] as const;
type Option = (typeof OPTIONS)[number];

export function StepType({
  draft,
  tree,
  onChange,
  labels,
}: {
  draft: SellDraft;
  tree: SellCategory[];
  onChange: (patch: Partial<SellDraft>) => void;
  labels: {
    options: Record<Option, { title: string; body: string }>;
    footnote: string;
    preferences: {
      title: string;
      hint: string;
      openToAnything: string;
      pickOne: string;
      full: string;
      remove: string;
    };
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

      {selected === "trade" && (
        <TradePreferences
          tree={tree}
          chosen={draft.tradePreferredCategoryIds}
          onChange={(ids) => onChange({ tradePreferredCategoryIds: ids })}
          labels={labels.preferences}
        />
      )}

      {/* 651:5237 */}
      <p className="text-ink-tertiary text-[12px]">{labels.footnote}</p>
    </>
  );
}

/**
 * "What would you take in return?" — the write side of the trade PDP's
 * "Looking to trade for" chips.
 *
 * Leaves, not roots: the suggestion ranking matches a stated category against
 * the other listing's own `categoryId`, and every listing is filed on a leaf —
 * so a root would draw a plausible chip that never matches anything. The roots
 * are the browsing row, exactly as in step 1.
 *
 * Empty is a real answer, and the default one: it means open to anything.
 */
function TradePreferences({
  tree,
  chosen,
  onChange,
  labels,
}: {
  tree: SellCategory[];
  chosen: string[];
  onChange: (ids: string[]) => void;
  labels: {
    title: string;
    hint: string;
    openToAnything: string;
    pickOne: string;
    full: string;
    remove: string;
  };
}) {
  const leaves = useMemo(() => leafIndex(tree), [tree]);
  const [root, setRoot] = useState<SellCategory | null>(null);

  const full = chosen.length >= TRADE_PREFERENCES_MAX;
  const toggle = (id: string) => {
    if (chosen.includes(id)) onChange(chosen.filter((each) => each !== id));
    else if (!full) onChange([...chosen, id]);
  };

  return (
    <section className="border-line flex flex-col gap-3 rounded-[14px] border p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{labels.title}</span>
        <span className="text-ink-secondary text-[13px]">{labels.hint}</span>
      </div>

      {/* The seller's own list, in the order they picked it — the order the
          PDP draws. Kept visible while browsing another root. */}
      <div className="flex flex-wrap gap-2.5">
        {chosen.length === 0 ? (
          <span className="text-ink-tertiary text-[12px]">
            {labels.openToAnything}
          </span>
        ) : (
          chosen.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-label={`${labels.remove} ${leaves.get(id) ?? id}`}
              className="bg-aqua text-on-accent flex h-[38px] items-center gap-2 rounded-[19px] px-3.5 text-[13px] font-semibold"
              dir="auto"
            >
              {leaves.get(id) ?? id}
              <span aria-hidden>×</span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {tree.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => setRoot(root?.id === node.id ? null : node)}
            className={`flex h-[34px] items-center rounded-[17px] px-3 text-[12px] font-semibold ${
              root?.id === node.id
                ? "bg-ink-900 text-base"
                : "bg-surface border-line border"
            }`}
            dir="auto"
          >
            {node.name}
          </button>
        ))}
      </div>

      {root ? (
        <div className="flex flex-wrap gap-2.5">
          {leavesOf(root).map((leaf) => {
            const on = chosen.includes(leaf.id);
            return (
              <button
                key={leaf.id}
                type="button"
                onClick={() => toggle(leaf.id)}
                aria-pressed={on}
                disabled={!on && full}
                className={`flex h-[38px] items-center rounded-[19px] px-3.5 text-[13px] font-semibold disabled:opacity-40 ${
                  on ? "bg-aqua text-on-accent" : "bg-surface border-line border"
                }`}
                dir="auto"
              >
                {leaf.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-ink-tertiary text-[12px]">{labels.pickOne}</p>
      )}

      {full && <p className="text-ink-tertiary text-[12px]">{labels.full}</p>}
    </section>
  );
}

/** Every leaf under a root — its children, or its grandchildren where it has any. */
function leavesOf(root: SellCategory): SellCategory[] {
  const children = root.children ?? [];
  if (children.length === 0) return [root];
  return children.flatMap((child) =>
    child.children?.length ? child.children : [child],
  );
}

/** Leaf id → name, so a chip picked under one root still has a label. */
function leafIndex(tree: SellCategory[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const root of tree) {
    for (const leaf of leavesOf(root)) index.set(leaf.id, leaf.name);
  }
  return index;
}

"use client";

import { useMemo, useState } from "react";
import { resolveMediaUrl } from "@/lib/api/media";
import {
  CATEGORY_TYPES,
  categoryTypeForSlug,
  type CategoryType,
} from "../../draft";
import type { SellCategory } from "../../types";

/**
 * Step 1 — Figma `651:5148` (Web_Sell_1_Category): four type cards, then a
 * sub-category chip row.
 *
 * The frame stops at two levels; the API needs a **leaf** category id, and
 * Fashion is three deep (type → Women → Dresses). So a second chip row appears
 * only when the picked branch has one — for Electronics, Furniture and Toys,
 * whose single root's children are already leaves, the frame's two rows are
 * exactly what shows. Recorded in plans/09 C36.
 */
export function StepCategory({
  tree,
  categoryId,
  onPick,
  labels,
}: {
  tree: SellCategory[];
  categoryId: string | null;
  onPick: (leafId: string, topId: string) => void;
  labels: {
    types: Record<CategoryType, { name: string; blurb: string }>;
    subCategory: string;
    pickOne: string;
  };
}) {
  const roots = useMemo(() => {
    const byType = new Map<CategoryType, SellCategory[]>();
    for (const node of tree) {
      const type = categoryTypeForSlug(node.slug);
      byType.set(type, [...(byType.get(type) ?? []), node]);
    }
    return byType;
  }, [tree]);

  // Redraw the branch the saved leaf belongs to when the step is reopened.
  const saved = useMemo(() => findBranch(tree, categoryId), [tree, categoryId]);
  const [type, setType] = useState<CategoryType | null>(
    saved ? categoryTypeForSlug(saved.root.slug) : null,
  );
  const [root, setRoot] = useState<SellCategory | null>(saved?.root ?? null);

  const typeRoots = type ? (roots.get(type) ?? []) : [];
  const single = typeRoots.length === 1 ? typeRoots[0] : null;
  const firstRow = single ? (single.children ?? []) : typeRoots;
  const secondRow = single ? [] : (root?.children ?? []);

  return (
    <>
      {/* cat cards — 651:5150 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CATEGORY_TYPES.map((each) => {
          const on = type === each;
          const icon = resolveMediaUrl(roots.get(each)?.[0]?.iconUrl ?? null);
          return (
            <button
              key={each}
              type="button"
              onClick={() => {
                setType(each);
                setRoot(null);
              }}
              className={`bg-base flex h-[158px] flex-col items-start rounded-16 p-3.5 text-start ${
                on ? "border-azure border-2" : "border-line border"
              }`}
            >
              <span className="bg-tint mb-3 flex size-11 items-center justify-center overflow-hidden rounded-12">
                {icon && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img src={icon} alt="" className="size-full object-cover" />
                )}
              </span>
              <span className="text-[15px] leading-[21px] font-semibold">
                {labels.types[each].name}
              </span>
              <span className="text-ink-secondary mt-auto text-[11px] leading-[15.4px]">
                {labels.types[each].blurb}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-category — 651:5166 */}
      {type && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold">{labels.subCategory}</p>
          <div className="flex flex-wrap gap-2.5">
            {firstRow.map((node) => (
              <Chip
                key={node.id}
                label={node.name}
                on={single ? categoryId === node.id : root?.id === node.id}
                onClick={() => {
                  if (single) onPick(node.id, single.id);
                  else setRoot(node);
                }}
              />
            ))}
          </div>

          {secondRow.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {secondRow.map((node) => (
                <Chip
                  key={node.id}
                  label={node.name}
                  on={categoryId === node.id}
                  onClick={() => onPick(node.id, root!.id)}
                />
              ))}
            </div>
          )}

          {!single && !root && (
            <p className="text-ink-tertiary text-[12px]">{labels.pickOne}</p>
          )}
        </div>
      )}
    </>
  );
}

/** chip — 651:5167 selected, 651:5169 unselected. */
function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[38px] items-center rounded-[19px] px-3.5 text-[13px] font-semibold ${
        on ? "bg-aqua text-on-accent" : "bg-surface border-line border"
      }`}
      dir="auto"
    >
      {label}
    </button>
  );
}

function findBranch(
  tree: SellCategory[],
  leafId: string | null,
): { root: SellCategory; leaf: SellCategory } | null {
  if (!leafId) return null;
  for (const root of tree) {
    if (root.id === leafId) return { root, leaf: root };
    for (const child of root.children ?? []) {
      if (child.id === leafId) return { root, leaf: child };
      for (const grandchild of child.children ?? []) {
        if (grandchild.id === leafId) return { root, leaf: grandchild };
      }
    }
  }
  return null;
}

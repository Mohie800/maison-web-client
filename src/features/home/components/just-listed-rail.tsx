"use client";

import { useState } from "react";
import type { ProductCard as Card } from "@/lib/api/schemas/cards";

export interface CategoryChip {
  id: string;
  label: string;
}

/**
 * "Just Listed" with category chips — Figma node 651:1131.
 *
 * Filters in place over cards already fetched on the server, rather than
 * refetching per chip or putting the selection in the URL. The homepage is
 * statically rendered with ISR; reading a search param here would make the whole
 * page dynamic for every visitor to shave one rail, which is a bad trade on the
 * most important page on the site.
 *
 * The card markup itself stays server-rendered — it arrives as `children` keyed
 * by card id, so this component only decides what to show.
 */
export function JustListedRail({
  cards,
  chips,
  allLabel,
  emptyLabel,
  renderedCards,
  rootByCard,
}: {
  cards: Card[];
  chips: CategoryChip[];
  allLabel: string;
  emptyLabel: string;
  renderedCards: Record<string, React.ReactNode>;
  /** card id → top-level category id, resolved on the server. */
  rootByCard: Record<string, string | null>;
}) {
  const [active, setActive] = useState<string | null>(null);

  const visible = active
    ? cards.filter((card) => rootByCard[card.id] === active)
    : cards;

  // Only offer a chip if something in the fetched set actually matches it.
  const usableChips = chips.filter((chip) =>
    cards.some((card) => rootByCard[card.id] === chip.id),
  );

  return (
    <>
      {usableChips.length > 0 && (
        <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
          <Chip
            label={allLabel}
            active={active === null}
            onClick={() => setActive(null)}
          />
          {usableChips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              active={active === chip.id}
              onClick={() => setActive(chip.id)}
            />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-body text-ink-tertiary">{emptyLabel}</p>
      ) : (
        // Four across, like every other rail. The extra xl column made these
        // cards narrower than the design and than their neighbours on the page.
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((card) => (
            <div key={card.id}>{renderedCards[card.id]}</div>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-caption shrink-0 rounded-[16px] border px-4 py-2 transition-colors ${
        active
          ? "border-action bg-action-tint text-action font-semibold"
          : "border-line text-ink-secondary hover:border-ink-tertiary"
      }`}
    >
      {label}
    </button>
  );
}

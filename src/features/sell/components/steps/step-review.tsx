"use client";

import { formatPrice } from "@/lib/format/money";
import { platformFee } from "@/lib/config/fees";
import type { SellDraft } from "../../draft";

/**
 * Step 9 — Figma `651:5915` (Web_Sell_9_Review): the listing as a card, then
 * four summary rows and the submission note.
 *
 * The frame's "Authenticity Score 82 / 100" row is dropped: the score is
 * computed by the API after the listing exists, so before submitting there is
 * nothing to show (see step 6). Its "You receive (after VAT + 1% fee)" row
 * uses the real rate for the reason given in step 7.
 *
 * The frame's "reviewed by admin before going live" is also dropped —
 * `POST /listings` returns a listing that is already `live` (GAP-76).
 */
const VAT_PERCENT = 15;

export function StepReview({
  draft,
  feePercent,
  categoryName,
  brandName,
  onChange,
  labels,
  conditionLabel,
  cityLabel,
}: {
  draft: SellDraft;
  feePercent: number;
  categoryName: string | null;
  brandName: string | null;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: {
    listPrice: string;
    youReceive: (percent: number) => string;
    shipsFrom: string;
    note: string;
    sale: string;
    auction: string;
    trade: string;
  };
  conditionLabel: (value: string) => string;
  cityLabel: (city: string) => string;
}) {
  void onChange;
  const buyerPays = Number(draft.price) || 0;
  const list = Number(draft.originalPrice) || buyerPays;
  const receives = Math.max(
    0,
    buyerPays -
      Math.round((buyerPays * VAT_PERCENT) / 100) -
      platformFee(buyerPays, feePercent),
  );
  const badge = draft.tradeEnabled
    ? labels.trade
    : draft.saleMode === "auction"
      ? labels.auction
      : labels.sale;

  return (
    <>
      <section className="bg-base border-line flex flex-col gap-4 rounded-16 border p-5">
        <div className="flex gap-4">
          <span className="bg-tint size-[100px] shrink-0 overflow-hidden rounded-12">
            {draft.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img
                src={draft.photos[0]}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            {brandName && (
              <span className="text-ink-tertiary text-[10px] font-bold uppercase">
                {brandName}
              </span>
            )}
            <span className="text-[18px] font-bold" dir="auto">
              {draft.title}
            </span>
            <span className="flex flex-wrap gap-2">
              <span className="bg-error-tint text-error flex h-5 items-center rounded-6 px-2 text-[10px] font-bold tracking-[0.4px] uppercase">
                {badge}
              </span>
              {draft.condition && (
                <span className="bg-action-tint text-action flex h-5 items-center rounded-6 px-2 text-[10px] font-bold tracking-[0.4px] uppercase">
                  {conditionLabel(draft.condition)}
                </span>
              )}
            </span>
            <span className="text-ink-secondary text-[13px]" dir="auto">
              {[
                categoryName,
                ...Object.values(draft.attributes)
                  .map((value) =>
                    Array.isArray(value) ? value.join(", ") : String(value),
                  )
                  .filter(Boolean),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>

        <div className="bg-line-subtle h-px w-full" />

        <Row label={labels.listPrice} value={formatPrice(list, "SAR")} />
        <Row
          label={labels.youReceive(feePercent)}
          value={formatPrice(receives, "SAR")}
          tone="text-action"
        />
        <Row label={labels.shipsFrom} value={cityLabel(draft.city)} />

        <p className="text-ink-tertiary text-[12px]">{labels.note}</p>
      </section>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-ink-secondary">{label}</span>
      <span className={tone ?? ""} dir="ltr">
        {value}
      </span>
    </div>
  );
}

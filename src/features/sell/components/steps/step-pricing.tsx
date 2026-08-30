"use client";

import { formatPrice } from "@/lib/format/money";
import { platformFee } from "@/lib/config/fees";
import { AUCTION_DURATIONS, type SellDraft } from "../../draft";

/**
 * Step 7 — Figma `651:5775` (Web_Sell_7_Pricing): Price and Discount side by
 * side, then a "Your earnings" card.
 *
 * The frame's card reads "Platform fee (1%)" and lands on SAR 168 from a
 * SAR 200 sale. The API charges 15% (plans/09 C18), so that number is wrong by
 * SAR 28 — on the one screen where a seller decides whether the sale is worth
 * making. The rate comes from `GET /settings/fees` and the row is labelled with
 * it.
 *
 * The frame's Price / Discount map cleanly onto the DTO: `originalPrice` is
 * the list price and `price` is what the buyer actually pays.
 *
 * Auction needs a starting bid, an optional reserve and a duration; there is
 * no auction variant of this frame, so those appear only when the listing type
 * is Auction. plans/09 C36.
 */
const VAT_PERCENT = 15;

export function StepPricing({
  draft,
  onChange,
  feePercent,
  labels,
}: {
  draft: SellDraft;
  onChange: (patch: Partial<SellDraft>) => void;
  feePercent: number;
  labels: {
    price: string;
    discount: string;
    earnings: string;
    buyerPays: string;
    buyerPaysAfter: (amount: string) => string;
    vat: string;
    platformFee: (percent: number) => string;
    youReceive: string;
    vatNote: (amount: string) => string;
    startingBid: string;
    reservePrice: string;
    duration: string;
    hours: (hours: number) => string;
  };
}) {
  const list = Number(draft.originalPrice) || 0;
  const discount = Math.max(0, list - (Number(draft.price) || 0));
  const buyerPays = Number(draft.price) || 0;
  const vat = Math.round((buyerPays * VAT_PERCENT) / 100);
  const fee = platformFee(buyerPays, feePercent);
  const receives = Math.max(0, buyerPays - vat - fee);
  const auction = draft.saleMode === "auction";

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Money
          label={labels.price}
          value={draft.originalPrice}
          onChange={(value) =>
            onChange({
              originalPrice: value,
              // Keep the buyer price in step with the list price until the
              // seller sets a discount of their own.
              price: discount > 0 ? draft.price : value,
            })
          }
        />
        <Money
          label={labels.discount}
          value={String(discount || "")}
          onChange={(value) => {
            const off = Math.max(0, Number(value) || 0);
            onChange({ price: String(Math.max(0, list - off)) });
          }}
        />
      </div>

      {auction && (
        <div className="grid gap-6 sm:grid-cols-3">
          <Money
            label={labels.startingBid}
            value={draft.startingBid}
            onChange={(value) => onChange({ startingBid: value })}
          />
          <Money
            label={labels.reservePrice}
            value={draft.reservePrice}
            onChange={(value) => onChange({ reservePrice: value })}
          />
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">{labels.duration}</span>
            <select
              value={draft.auctionDurationHours}
              onChange={(event) =>
                onChange({ auctionDurationHours: Number(event.target.value) })
              }
              className="bg-base border-line h-12 rounded-12 border px-4 text-[14px] outline-none"
            >
              {AUCTION_DURATIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {labels.hours(hours)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Your earnings — 651:5775's card */}
      <section className="bg-base border-line flex flex-col gap-3 rounded-16 border p-5">
        <h2 className="text-[14px] font-semibold">{labels.earnings}</h2>
        <Row
          label={
            discount > 0
              ? labels.buyerPaysAfter(formatPrice(discount, "SAR"))
              : labels.buyerPays
          }
          value={formatPrice(buyerPays, "SAR")}
        />
        <Row label={labels.vat} value={`− ${formatPrice(vat, "SAR")}`} />
        <Row
          label={labels.platformFee(feePercent)}
          value={`− ${formatPrice(fee, "SAR")}`}
        />
        <div className="bg-line-subtle h-px w-full" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] font-semibold">{labels.youReceive}</span>
          <span className="text-action text-[15px] font-bold" dir="ltr">
            {formatPrice(receives, "SAR")}
          </span>
        </div>
      </section>

      <p className="text-ink-tertiary text-[12px]">
        {labels.vatNote(formatPrice(buyerPays, "SAR"))}
      </p>
    </>
  );
}

function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        dir="ltr"
        className="bg-base border-line h-12 rounded-12 border px-4 text-[14px] outline-none"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="text-ink-secondary">{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}

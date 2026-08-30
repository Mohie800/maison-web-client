"use client";

import {
  CITIES,
  FULFILLMENT_METHODS,
  SHIPPING_PAYERS,
  type SellDraft,
} from "../../draft";

/**
 * Step 8 — Figma `651:5844` (Web_Sell_8_Shipping): City, Carrier, Package size
 * and Weight.
 *
 * Only City exists on the listing. There is no carrier, package-size or weight
 * field anywhere on `CreateListingDto` — carriers are chosen by the *buyer* at
 * checkout from `GET /shipping-options`, which is what the frame's own
 * footnote says ("Rates are calculated by the carrier"). Three controls that
 * store nothing would be three lies, so they are dropped.
 *
 * What the listing does carry, and the frame does not draw, is
 * `fulfillmentMethod` and `shippingPayer` — whether the item ships, is picked
 * up, or both, and who pays. Those decide what the buyer sees at checkout, so
 * they are added here. plans/09 C36.
 */
export function StepShipping({
  draft,
  onChange,
  labels,
  cityLabel,
  methodLabel,
  payerLabel,
}: {
  draft: SellDraft;
  onChange: (patch: Partial<SellDraft>) => void;
  labels: { city: string; fulfillment: string; payer: string; note: string };
  cityLabel: (city: string) => string;
  methodLabel: (method: string) => string;
  payerLabel: (payer: string) => string;
}) {
  const select =
    "bg-base border-line h-12 w-full rounded-12 border px-4 text-[14px] outline-none";

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">{labels.city}</span>
          <select
            value={draft.city}
            onChange={(event) =>
              onChange({ city: event.target.value as SellDraft["city"] })
            }
            className={select}
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {cityLabel(city)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">
            {labels.fulfillment}
          </span>
          <select
            value={draft.fulfillmentMethod}
            onChange={(event) =>
              onChange({
                fulfillmentMethod: event.target
                  .value as SellDraft["fulfillmentMethod"],
              })
            }
            className={select}
          >
            {FULFILLMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {methodLabel(method)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Package size — 651:5844's chip row, reused for who pays shipping. */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[13px] font-semibold">
          {labels.payer}
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {SHIPPING_PAYERS.map((payer) => {
            const on = draft.shippingPayer === payer;
            return (
              <label
                key={payer}
                className={`flex h-[38px] cursor-pointer items-center rounded-[19px] px-3.5 text-[13px] font-semibold ${
                  on ? "bg-aqua text-on-accent" : "bg-base border-line border"
                }`}
              >
                <input
                  type="radio"
                  name="shippingPayer"
                  checked={on}
                  onChange={() => onChange({ shippingPayer: payer })}
                  className="sr-only"
                />
                {payerLabel(payer)}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 651:5844's footnote, which is accurate. */}
      <p className="text-ink-tertiary text-[12px]">{labels.note}</p>
    </>
  );
}

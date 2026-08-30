"use client";

import { useState } from "react";

/**
 * The cash-difference control on Web_Trade_CounterOffer — `651:6412`, with the
 * quick chips at `651:6418`–`651:6427`.
 *
 * The frame takes a signed amount ("Positive = they pay you. Negative = you pay
 * them"), but the API's `amount` is `minimum: 0` and only the target listing's
 * owner may counter — so the cash can only run towards whoever is countering.
 * The chips still nudge in both directions; the value clamps at zero and the
 * tag states the direction rather than offering it as a choice (GAP-85).
 */
export function CounterAmount({
  name,
  defaultValue,
  currencyLabel,
  directionLabel,
  resetLabel,
  helpText,
}: {
  name: string;
  defaultValue: number;
  currencyLabel: string;
  directionLabel: string;
  resetLabel: string;
  helpText: string;
}) {
  const [amount, setAmount] = useState(String(defaultValue));

  const nudge = (by: number) =>
    setAmount(
      String(Number(Math.max(0, (Number(amount) || 0) + by).toFixed(2))),
    );

  return (
    <>
      {/* input — 651:6412 */}
      <div className="bg-base border-focus flex h-14 w-full items-center rounded-12 border-[1.5px] px-4">
        <span className="text-ink-tertiary shrink-0 text-[15px] font-medium">
          {currencyLabel}
        </span>
        <input
          name={name}
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value.replace(/[^\d.]/g, ""))
          }
          inputMode="decimal"
          dir="ltr"
          aria-label={helpText}
          className="text-ink ms-4 min-w-0 flex-1 bg-transparent text-[18px] font-semibold outline-none"
        />
        <span className="bg-success-tint3 text-success flex h-[30px] shrink-0 items-center rounded-8 px-3.5 text-[12px] font-semibold">
          {directionLabel}
        </span>
      </div>

      <p className="text-ink-tertiary text-[12px]">{helpText}</p>

      {/* chips — 651:6418 */}
      <div className="flex flex-wrap gap-2.5">
        {[-50, -25, 25, 50].map((by) => (
          <button
            key={by}
            type="button"
            onClick={() => nudge(by)}
            className="bg-surface border-line text-ink h-9 rounded-[18px] border px-3 text-[13px] font-semibold"
            dir="ltr"
          >
            {by > 0 ? `+${by}` : by}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount("0")}
          className="bg-surface border-line text-ink h-9 rounded-[18px] border px-3 text-[13px] font-semibold"
        >
          {resetLabel}
        </button>
      </div>
    </>
  );
}

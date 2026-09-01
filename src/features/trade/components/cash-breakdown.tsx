import { formatPrice } from "@/lib/format/money";
import type { TradeCash } from "../helpers";

/**
 * Cash breakdown — `651:6356`, reused as the counter screen's "Updated
 * breakdown" (`651:6428`), which drops the two item-value rows and the card
 * border in favour of a `bg/surface` panel.
 *
 * The frame prints the rates in the labels; the amounts are the API's own
 * `commissionAmount` and half of `shippingTotal`, so a rate change shows up
 * without a code change.
 */
export function CashBreakdown({
  cash,
  theirValue,
  myValue,
  currency,
  variant = "card",
  labels,
}: {
  cash: TradeCash;
  theirValue: number;
  myValue: number;
  currency: string;
  /** `card` is the standalone panel; `panel` is the counter screen's inset. */
  variant?: "card" | "panel";
  labels: {
    title: string;
    theirValue: string;
    myValue: string;
    even: string;
    theyPay: string;
    youPay: string;
    difference: string;
    fee: string;
    shipping: string;
    receive: string;
    pay: string;
  };
}) {
  const card = variant === "card";
  const signed = (value: number) =>
    `${value < 0 ? "−" : "+"} ${formatPrice(Math.abs(value), currency)}`;

  return (
    <div
      className={
        card
          ? "bg-base border-line flex flex-col rounded-16 border p-6"
          : "bg-surface flex w-full flex-col rounded-12 p-5"
      }
    >
      <h2
        className={
          card
            ? "text-ink mb-5 text-[16px] font-semibold"
            : "text-ink mb-4 text-[13px] font-semibold"
        }
      >
        {labels.title}
      </h2>

      <dl className="flex flex-col gap-2">
        {card && (
          <>
            <Row
              label={labels.theirValue}
              value={formatPrice(theirValue, currency)}
            />
            <Row
              label={labels.myValue}
              value={formatPrice(myValue, currency)}
            />
          </>
        )}

        {cash.isEven ? (
          <Row label={labels.even} value="—" />
        ) : (
          <Row
            label={
              card
                ? cash.difference >= 0
                  ? labels.theyPay
                  : labels.youPay
                : labels.difference
            }
            value={signed(cash.difference)}
            tone={cash.difference >= 0 ? "text-success" : "text-ink"}
          />
        )}

        {cash.commission > 0 && (
          <Row label={labels.fee} value={signed(-cash.commission)} />
        )}
        {cash.shippingShare > 0 && (
          <Row label={labels.shipping} value={signed(-cash.shippingShare)} />
        )}
      </dl>

      {/* Rectangle — 651:6368 */}
      <span className="bg-line-subtle mt-5 h-px w-full" aria-hidden />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-ink text-[15px] font-semibold">
          {cash.net >= 0 ? labels.receive : labels.pay}
        </span>
        <span
          className={`text-[16px] font-bold ${
            cash.net >= 0 ? "text-success" : "text-ink"
          }`}
          dir="ltr"
        >
          {formatPrice(Math.abs(cash.net), currency)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-ink-secondary text-[14px]">{label}</dt>
      <dd className={`text-[14px] font-medium ${tone}`} dir="ltr">
        {value}
      </dd>
    </div>
  );
}

import { ArrowLeftRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { startConversationAction } from "@/features/inbox/actions";
import { formatPrice } from "@/lib/format/money";

/**
 * The buy column of Web_PDP_Trade — `651:4632`–`651:4667`.
 *
 * A trade listing is not for sale, so the frame replaces the price with an
 * estimated value, and Buy now / Add to bag with Request trade / Message
 * seller. Everything here is that column; the gallery, description and related
 * rail are the PDP's own and are unchanged.
 *
 * Two things the frame draws that no field carries, both left out rather than
 * invented (plans/09 C57):
 *
 * - **"Looking to trade for" — Bags · Outerwear · Sneakers · Watches.** A
 *   listing has no wanted-categories field of any kind. This is the screen's
 *   defining control, and it is the one thing on it we cannot fill.
 * - **"Usually responds within an hour"** and the seller's "4.9 (38 trades)".
 *   Neither a response time nor a trade count exists on any payload (C42).
 */
export function TradePanel({
  listingId,
  value,
  currency,
  authenticityScore,
  locale,
  labels,
}: {
  listingId: string;
  value: string | number | null | undefined;
  currency: string;
  authenticityScore: number | null | undefined;
  locale: string;
  labels: {
    badge: string;
    estimatedValue: string;
    estimatedValueHint: string;
    cashTopUp: string;
    requestTrade: string;
    messageSeller: string;
    authenticity: string;
    authenticityOf: string;
    trusted: string;
    shippingTitle: string;
    shippingBody: string;
  };
}) {
  return (
    <>
      {/* badge — 651:4632 */}
      <span className="bg-info-tint3 text-azure w-fit rounded-[6px] px-2.5 py-1 text-[10px] font-bold tracking-[0.4px]">
        {labels.badge}
      </span>

      {/* est — 651:4637 */}
      <div className="bg-surface flex items-start justify-between gap-4 rounded-12 p-5">
        <span className="flex flex-col gap-1">
          <span className="text-ink-tertiary text-[12px] font-medium">
            {labels.estimatedValue}
          </span>
          <span className="text-ink text-[22px] font-extrabold" dir="ltr">
            {formatPrice(value, currency)}
          </span>
        </span>
        <span className="text-ink-tertiary max-w-[110px] text-[11px]">
          {labels.estimatedValueHint}
        </span>
      </div>

      <p className="text-ink-tertiary text-[12px]">{labels.cashTopUp}</p>

      {/* btn/primary — 651:4651 */}
      <Link
        href={`/trade/offer/${listingId}`}
        className="bg-aqua text-on-accent flex h-13 items-center justify-center gap-2 rounded-12 text-[15px] font-semibold"
      >
        <ArrowLeftRight className="size-4" aria-hidden />
        {labels.requestTrade}
      </Link>

      {/* btn/secondary — 651:4653 */}
      <form action={startConversationAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="listingId" value={listingId} />
        <button
          type="submit"
          className="bg-base border-line text-ink h-12 w-full rounded-12 border text-[15px] font-semibold"
        >
          {labels.messageSeller}
        </button>
      </form>

      {/* auth — 651:4663. The score is computed from the seller's verification
          checklist, so it is 0 until they complete step 6 of the wizard. */}
      {authenticityScore ? (
        <div className="bg-surface flex items-center justify-between gap-4 rounded-12 px-4 py-2.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-ink-tertiary text-[12px] font-medium">
              {labels.authenticity}
            </span>
            <span className="text-success text-[16px] font-bold" dir="ltr">
              {labels.authenticityOf.replace(
                "{score}",
                String(authenticityScore),
              )}
            </span>
          </span>
          {authenticityScore >= 80 && (
            <span className="bg-aqua-tint text-success rounded-[6px] px-2.5 py-1 text-[10px] font-bold tracking-[0.4px]">
              {labels.trusted}
            </span>
          )}
        </div>
      ) : null}

      {/* ship — 651:4670, moved into the column since it is trade-only copy. */}
      <div className="bg-surface flex flex-col gap-2 rounded-12 p-5">
        <span className="text-ink text-[13px] font-semibold">
          {labels.shippingTitle}
        </span>
        <span className="text-ink-secondary text-[13px]">
          {labels.shippingBody}
        </span>
      </div>
    </>
  );
}

import { Package } from "lucide-react";
import { coverPhotoUrl, type Listing } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";

/** Shared thumbnail. `t/fill-100` behind the photo, 8px corners throughout. */
export function TradeThumb({
  listing,
  className,
  bg = "bg-fill-100",
}: {
  listing: Listing | null;
  className: string;
  bg?: string;
}) {
  const url = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-8 ${bg} ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <Package className="text-ink-400 size-5" aria-hidden />
      )}
    </span>
  );
}

/** ICard — `651:6518`. A tinted panel naming one side of the swap. */
export function TradeSideCard({
  listing,
  caption,
  fallbackTitle,
  by,
  currency,
  tone,
}: {
  listing: Listing | null;
  caption: string;
  fallbackTitle: string;
  by: string;
  currency: string;
  tone: string;
}) {
  return (
    <div
      className={`border-line-200 flex min-w-0 flex-1 flex-col items-start gap-2.5 rounded-12 border p-3.5 ${tone}`}
    >
      <span className="text-ink-400 text-[11px] font-bold">{caption}</span>
      <div className="flex w-full items-center gap-2.5">
        <TradeThumb listing={listing} className="size-12" bg="bg-base" />
        <div className="flex min-w-0 flex-col items-start gap-[3px]">
          <span
            className="text-ink-900 w-full truncate text-[13px] font-semibold"
            dir="auto"
          >
            {listing?.title ?? fallbackTitle}
          </span>
          <span className="text-ink-500 text-[11px]" dir="auto">
            {listing ? formatPrice(listing.price, listing.currency ?? currency) : "—"}
            {"  ·  "}
            {by}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * item/… — `651:6341`. The 360×252 comparison card on the received-offer
 * screen: a 128px image, the brand kicker, the title, the condition in azure,
 * then "Est. value" against the price.
 */
export function TradeCompareCard({
  listing,
  fallbackTitle,
  valueLabel,
  value,
  currency,
  conditionLabel,
}: {
  listing: Listing | null;
  fallbackTitle: string;
  valueLabel: string;
  value: number;
  currency: string;
  conditionLabel: string | null;
}) {
  const url = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;

  return (
    <div className="bg-base border-line flex min-w-0 flex-1 flex-col rounded-16 border p-4">
      <span className="bg-tint flex h-32 w-full items-center justify-center overflow-hidden rounded-12">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="text-ink-tertiary size-8" aria-hidden />
        )}
      </span>

      <span className="text-ink-tertiary mt-3 text-[10px] font-bold" dir="auto">
        {listing?.brand?.name ?? " "}
      </span>
      <span className="text-ink text-[15px] font-semibold" dir="auto">
        {listing?.title ?? fallbackTitle}
      </span>
      {conditionLabel && (
        <span className="text-azure mt-2 text-[12px] font-medium">
          {conditionLabel}
        </span>
      )}

      <div className="mt-auto flex items-end justify-between pt-3">
        <span className="text-ink-tertiary text-[11px]">{valueLabel}</span>
        <span className="text-ink text-[15px] font-bold" dir="ltr">
          {formatPrice(value, currency)}
        </span>
      </div>
    </div>
  );
}

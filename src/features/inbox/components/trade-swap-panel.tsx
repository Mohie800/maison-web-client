import { Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Conversation } from "@/lib/api/schemas/conversation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import {
  acceptTradeAction,
  declineTradeAction,
} from "@/features/trade/actions";

/**
 * The swap summary and its two actions above a trade thread — `651:6766` and
 * `651:6785` on Web_Inbox_TradeChat.
 *
 * That frame draws a different inbox from `651:6796`: two separate cards, a
 * 520px chat, a dark Send button. The layout we ship is `651:6796`, which is
 * the fuller of the two — it has the search field, the online state and the
 * listing chip. What this frame adds and the other lacks is trade-aware: the
 * swap strip, the Accept/Decline pair and the perspective badges. Those are
 * merged in; the competing layout is not (plans/09 C46).
 *
 * Everything here comes off `conversation.trade`, which — unlike the trade
 * endpoints — joins `coverPhotoUrl` onto the offered listings (GAP-83). The
 * cash difference is not on this payload, so the strip states the swap and
 * links to the trade for the numbers rather than guessing at them.
 */
export function TradeSwapPanel({
  conversation,
  viewerId,
  locale,
  labels,
}: {
  conversation: Conversation;
  viewerId: string;
  locale: string;
  labels: {
    theirItem: string;
    yourItem: string;
    viewTrade: string;
    accept: string;
    decline: string;
    status: string;
  };
}) {
  const trade = conversation.trade;
  if (!trade) return null;

  const offered = trade.offeredListings?.[0] ?? null;
  const target = conversation.listing ?? null;
  const isRequester = trade.requesterId === viewerId;

  // The requester gives the offered item and receives the target listing.
  const mine = isRequester ? offered : target;
  const theirs = isRequester ? target : offered;

  // Only the target listing's owner answers an open offer.
  const canDecide =
    !isRequester &&
    (trade.status === "pending" || trade.status === "countered");

  return (
    <div className="border-line-subtle flex flex-col gap-3 border-b p-4">
      {/* swap — 651:6766 */}
      <div className="bg-surface flex items-center gap-4 rounded-[14px] p-4">
        <SwapSide
          title={theirs?.title}
          price={theirs?.price}
          photo={theirs?.coverPhotoUrl}
          caption={labels.theirItem}
        />
        <span className="text-azure shrink-0 text-[20px] font-bold" aria-hidden>
          ⇄
        </span>
        <SwapSide
          title={mine?.title}
          price={mine?.price}
          photo={mine?.coverPhotoUrl}
          caption={labels.yourItem}
          align="end"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/account/trades/${trade.id}`}
          className="bg-base border-line text-ink flex h-9 items-center justify-center rounded-10 border px-4 text-[12px] font-semibold"
        >
          {labels.viewTrade}
        </Link>
        <span className="text-ink-tertiary text-[11px]">{labels.status}</span>
      </div>

      {/* actions — 651:6785 */}
      {canDecide && (
        <div className="flex gap-3">
          <form action={acceptTradeAction} className="flex-1">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={trade.id} />
            <button
              type="submit"
              className="bg-aqua text-on-accent h-12 w-full rounded-12 text-[14px] font-semibold"
            >
              {labels.accept}
            </button>
          </form>
          <form action={declineTradeAction} className="flex-1">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={trade.id} />
            <button
              type="submit"
              className="bg-error-tint2 text-error h-12 w-full rounded-12 text-[14px] font-semibold"
            >
              {labels.decline}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SwapSide({
  title,
  price,
  photo,
  caption,
  align = "start",
}: {
  title: string | null | undefined;
  price: string | null | undefined;
  photo: string | null | undefined;
  caption: string;
  align?: "start" | "end";
}) {
  const url = resolveMediaUrl(photo);
  const end = align === "end";

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-3 ${end ? "flex-row-reverse" : ""}`}
    >
      <span className="bg-tint flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-10">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="text-ink-tertiary size-6" aria-hidden />
        )}
      </span>
      <div className={`flex min-w-0 flex-col gap-1 ${end ? "items-end" : ""}`}>
        <span
          className="text-ink truncate text-[13px] font-semibold"
          dir="auto"
        >
          {title}
        </span>
        <span className="text-ink-secondary text-[11px]" dir="auto">
          {caption}
          {price ? ` · ${formatPrice(price, "SAR")}` : ""}
        </span>
      </div>
    </div>
  );
}

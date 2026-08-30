import { Package, SendHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Conversation, Message } from "@/lib/api/schemas/conversation";
import { resolveMediaUrl } from "@/lib/api/media";
import { sendMessageAction } from "../actions";
import { avatarTint, initials, safeAttachmentUrl } from "../helpers";
import { ThreadPoller } from "./thread-poller";
import { TradeSwapPanel } from "./trade-swap-panel";

/**
 * The chat pane — `651:6865`: a header strip, the bubbles, and the composer.
 *
 * Own messages sit right on aqua with a `t/success-deep` timestamp; theirs sit
 * left on `t/fill-100`. Image messages are rendered — `type: "image"` rows do
 * come back from the API — but cannot be composed, since nothing turns a picked
 * file into a URL (GAP-72).
 */
export function MessageThread({
  conversation,
  messages,
  viewerId,
  locale,
  error,
  labels,
}: {
  conversation: Conversation;
  messages: Message[];
  viewerId: string;
  locale: string;
  error: string | null;
  labels: {
    online: string;
    offline: string;
    placeholder: string;
    send: string;
    attachmentBlocked: string;
    trade: {
      theirItem: string;
      yourItem: string;
      viewTrade: string;
      accept: string;
      decline: string;
      status: string;
    };
    error: string | null;
    time: (iso: string) => string;
  };
}) {
  const other = conversation.otherUser;
  const name = other?.fullName ?? "";
  const avatar = resolveMediaUrl(other?.profilePic);
  const listing = conversation.listing;
  const cover = resolveMediaUrl(listing?.coverPhotoUrl);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <ThreadPoller />

      {/* ChatHdr — 651:6866 */}
      <div className="border-line-200 flex h-15 shrink-0 items-center gap-3 border-b px-4">
        <span
          className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-[11px] font-bold ${avatarTint(
            other?.id,
          )}`}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>

        {/* HI — 651:6869 */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="text-ink-900 truncate text-[14px] font-semibold"
            dir="auto"
          >
            {name}
          </span>
          <span
            className={`text-[11px] ${
              other?.isOnline ? "text-action" : "text-ink-400"
            }`}
          >
            {other?.isOnline ? labels.online : labels.offline}
          </span>
        </div>

        {/* RI — 651:6872 */}
        {listing?.id && (
          <Link
            href={`/products/${listing.id}`}
            className="bg-fill-50 border-line-200 flex h-9 shrink-0 items-center justify-center gap-2 rounded-8 border px-2.5"
          >
            <span className="bg-fill-100 flex h-6 w-6 items-center justify-center overflow-hidden rounded-[4px]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img src={cover} alt="" className="size-full object-cover" />
              ) : (
                <Package className="text-ink-700 size-3" aria-hidden />
              )}
            </span>
            <span
              className="text-ink-700 max-w-[180px] truncate text-[11px]"
              dir="auto"
            >
              {listing.title}
            </span>
          </Link>
        )}
      </div>

      {conversation.trade && (
        <TradeSwapPanel
          conversation={conversation}
          viewerId={viewerId}
          locale={locale}
          labels={labels.trade}
        />
      )}

      {/* Msgs — 651:6876 */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const mine = message.senderId === viewerId;
          const attachment = safeAttachmentUrl(message.attachmentUrl);
          return (
            <div
              key={message.id}
              className={`flex w-full items-start ${mine ? "justify-end" : ""}`}
            >
              {/* Bubble — 651:6878 / 651:6882 */}
              <div
                className={`flex max-w-[70%] flex-col gap-1 rounded-[14px] px-3.5 py-2.5 ${
                  mine ? "bg-aqua" : "bg-fill-100"
                }`}
              >
                {message.type === "image" && attachment ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={resolveMediaUrl(attachment) ?? ""}
                    alt=""
                    className="max-h-60 rounded-10 object-cover"
                  />
                ) : (
                  <span
                    className={`text-[13px] break-words ${
                      mine ? "text-black" : "text-ink-900"
                    }`}
                    dir="auto"
                  >
                    {message.body ?? labels.attachmentBlocked}
                  </span>
                )}
                {message.createdAt && (
                  <span
                    className={`text-[9px] ${
                      mine ? "text-success-deep" : "text-ink-400"
                    }`}
                    dir="auto"
                  >
                    {labels.time(message.createdAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {labels.error && error && (
        <p className="bg-error-tint text-error mx-4 mb-2 rounded-10 p-2 text-[12px]">
          {labels.error}
        </p>
      )}

      {/* Input — 651:6897 */}
      <form
        action={sendMessageAction}
        className="border-line-200 flex h-15 shrink-0 items-center gap-2.5 border-t px-4 py-2.5"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={conversation.id} />
        <div className="bg-fill-50 border-line-200 flex h-10 min-w-0 flex-1 items-center rounded-20 border ps-3.5">
          <input
            name="body"
            placeholder={labels.placeholder}
            aria-label={labels.placeholder}
            maxLength={2000}
            autoComplete="off"
            className="text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 bg-transparent pe-3.5 text-[13px] outline-none"
          />
        </div>
        <button
          type="submit"
          aria-label={labels.send}
          className="bg-aqua flex size-10 shrink-0 items-center justify-center rounded-20 text-black"
        >
          <SendHorizontal className="size-4 rtl:rotate-180" aria-hidden />
        </button>
      </form>
    </div>
  );
}

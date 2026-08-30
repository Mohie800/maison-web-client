import { Link } from "@/i18n/navigation";
import {
  CATEGORY_TONE,
  type Notification,
} from "@/lib/api/schemas/notification";

/**
 * The two pieces of `651:1567` that both the dropdown and the full page draw.
 *
 * Kept here rather than in either caller so the row has one definition: the
 * notification payload is inferred (GAP-79), and when it is finally pinned down
 * there should be a single place to correct.
 */

/** T — `651:1575`. */
export function NotificationTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number | null | undefined;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-[42px] shrink-0 items-center gap-1.5 px-3 text-[12px] ${
        active ? "text-ink-900 font-semibold" : "text-ink-500"
      }`}
    >
      {label}
      {count ? <span className="text-ink-tertiary">{count}</span> : null}
    </Link>
  );
}

/** NI — `651:1586`. Unread rows carry the surface tint and the aqua dot. */
export function NotificationRow({
  item,
  when,
  categoryLabel,
  viewLabel,
  onNavigate,
}: {
  item: Notification;
  when: (iso: string) => string;
  categoryLabel: (key: string) => string;
  viewLabel: string;
  /** Lets the dropdown close itself when a row is followed. */
  onNavigate?: () => void;
}) {
  const unread = !item.readAt;
  const category = item.category ?? "orders";
  const tone = CATEGORY_TONE[category] ?? "bg-fill-100 text-ink-700";
  const text = item.title ?? item.body ?? "";
  /*
    `payload` is type-specific and carries only an id — the API deliberately
    keeps the routing ours. Ordered so the most specific destination wins.
  */
  const p = item.payload;
  const href = p?.orderId
    ? `/account/orders/${p.orderId}`
    : p?.conversationId
      ? `/inbox/${p.conversationId}`
      : p?.tradeId
        ? `/account/trades/${p.tradeId}`
        : p?.listingId
          ? `/products/${p.listingId}`
          : p?.userId
            ? `/sellers/${p.userId}`
            : null;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${unread ? "bg-surface-cool" : ""}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${tone}`}
      >
        {categoryLabel(category)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-ink-700 text-[12px]" dir="auto">
          {text}
        </p>
        {item.createdAt && (
          <p className="text-ink-tertiary text-[10px]">
            {when(item.createdAt)}
          </p>
        )}
        {href && (
          <Link
            href={href}
            onClick={onNavigate}
            className={`flex h-[26px] w-fit items-center rounded-8 px-2.5 text-[10px] font-bold ${tone}`}
          >
            {viewLabel}
          </Link>
        )}
      </div>

      {unread && (
        <span
          className="bg-aqua mt-1.5 size-2 shrink-0 rounded-full"
          aria-hidden
        />
      )}
    </div>
  );
}

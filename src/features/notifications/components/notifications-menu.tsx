"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BellFilled } from "@/components/icons/header-icons";
import {
  CATEGORY_PARAM,
  NOTIFICATION_CATEGORIES,
  type Notification,
  type NotificationCategory,
} from "@/lib/api/schemas/notification";
import { NotificationRow } from "./notification-row";

interface Payload {
  items: Notification[];
  unreadCount?: number | null;
  categoryCounts?: Partial<Record<"all" | NotificationCategory, number | null>>;
}

/**
 * Web_NotificationsDropdown — `651:1567`.
 *
 * The bell opened `/account/notifications` until this shipped; that page stays
 * as the "See all" destination and is still the only place the list paginates.
 *
 * The panel fetches on first open rather than with the header, so a page that
 * nobody opens the bell on pays nothing. The initial unread count comes from
 * the server so the badge is right before any of this runs.
 *
 * The frame's tabs are All / Orders / Messages / Auctions / Trade; the API
 * filters on three more. The tabs are the API's, for the reason recorded in
 * plans/09 C38.
 */
export function NotificationsMenu({
  initialUnread,
  label,
}: {
  initialUnread: number;
  label: string;
}) {
  const t = useTranslations("Notifications");
  const format = useFormatter();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationCategory | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onAway = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const query = tab
          ? `?category=${CATEGORY_PARAM[tab]}&limit=6`
          : "?limit=6";
        const res = await fetch(`/api/proxy/notifications${query}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = (await res.json()) as Payload;
        if (!cancelled) {
          setData(payload);
          setUnread(payload.unreadCount ?? 0);
        }
      } catch {
        // Offline or signed out — the panel shows its empty state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  const markAllRead = async () => {
    try {
      await fetch("/api/proxy/notifications/read-all", { method: "POST" });
      setUnread(0);
      // Unread is `readAt === null`; there is no `isRead` flag on the row.
      const readAt = new Date().toISOString();
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => ({ ...i, readAt })) }
          : prev,
      );
    } catch {
      // The dots stay where they were; nothing to tell the user.
    }
  };

  const counts = data?.categoryCounts ?? {};
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${label} (${unread})` : label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="bg-surface text-ink-900 relative flex size-10 shrink-0 items-center justify-center rounded-[20px]"
      >
        <BellFilled className="size-6" />
        {unread > 0 && (
          <span className="bg-error text-base absolute -end-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        /* Web_NotificationsDropdown — 651:1567 */
        <div
          role="menu"
          className="bg-base border-line-200 absolute end-0 top-12 z-50 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-16 border shadow-lg"
        >
          {/* Hdr — 651:1568 */}
          <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-ink-900 text-[16px] font-bold">
                {t("title")}
              </span>
              {unread > 0 && (
                <span className="bg-error text-base flex h-[22px] items-center rounded-[11px] px-2 text-[10px] font-bold">
                  {t("new", { count: unread })}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-action text-[12px] font-medium"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Tabs — 651:1574 */}
          <div className="flex h-[42px] items-center overflow-x-auto ps-3">
            <button
              type="button"
              onClick={() => setTab(null)}
              className={`flex h-[42px] shrink-0 items-center gap-1.5 px-3 text-[12px] ${
                tab === null ? "text-ink-900 font-semibold" : "text-ink-500"
              }`}
            >
              {t("tabs.all")}
              {counts.all ? (
                <span className="text-ink-tertiary">{counts.all}</span>
              ) : null}
            </button>
            {NOTIFICATION_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setTab(category)}
                className={`flex h-[42px] shrink-0 items-center gap-1.5 px-3 text-[12px] ${
                  tab === category
                    ? "text-ink-900 font-semibold"
                    : "text-ink-500"
                }`}
              >
                {t(`tabs.${category}`)}
                {counts[category] ? (
                  <span className="text-ink-tertiary">{counts[category]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <span className="bg-fill-100 h-px w-full" aria-hidden />

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-ink-tertiary p-10 text-center text-[12px]">
                {t("loading")}
              </p>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-ink-900 mb-1 text-[13px] font-semibold">
                  {t("emptyTitle")}
                </p>
                <p className="text-ink-secondary text-[12px]">
                  {t("emptyBody")}
                </p>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && (
                    <span
                      className="bg-fill-100 block h-px w-full"
                      aria-hidden
                    />
                  )}
                  <NotificationRow
                    item={item}
                    when={(iso) =>
                      format.relativeTime(new Date(iso), new Date())
                    }
                    categoryLabel={(key) =>
                      t.has(`badges.${key}` as never)
                        ? t(`badges.${key}` as never)
                        : key.toUpperCase()
                    }
                    actionLabel={(type) =>
                      t.has(`actions.${type}` as never)
                        ? t(`actions.${type}` as never)
                        : t("view")
                    }
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              ))
            )}
          </div>

          <span className="bg-fill-100 h-px w-full" aria-hidden />

          {/* SA — 651:1644 */}
          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="text-action flex items-center justify-center py-3.5 text-[13px] font-medium"
          >
            {t("seeAll")}
          </Link>
        </div>
      )}
    </div>
  );
}

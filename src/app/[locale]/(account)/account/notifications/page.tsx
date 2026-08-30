import type { Metadata } from "next";
import {
  getTranslations,
  setRequestLocale,
  getFormatter,
} from "next-intl/server";
import { getNotifications } from "@/lib/api/endpoints/notifications";
import {
  isNotificationCategory,
  NOTIFICATION_CATEGORIES,
} from "@/lib/api/schemas/notification";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import {
  NotificationRow,
  NotificationTab,
} from "@/features/notifications/components/notification-row";
import { markAllReadAction } from "@/features/notifications/actions";

/**
 * Notifications — the full-page form of Figma `651:1567`
 * (Web_NotificationsDropdown), which is the only frame for this content. The
 * header's bell has always linked here.
 *
 * The frame's tabs are All / Orders / Messages / Auctions / Trade, and since
 * GAP-79 landed all five filter on something. They come first, in the frame's
 * order, followed by Price drops / Social / Promotions — three the API also
 * serves and the design never drew. Dropping them would leave a user able to
 * switch on price-drop alerts they can never filter for (plans/09 C38).
 *
 * ⚠️ No account on dev has a notification and no response schema is published,
 * so the row's fields are inferred and each renders only when present
 * (GAP-79).
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Notifications");
  const format = await getFormatter();
  const query = await searchParams;
  const tab = isNotificationCategory(query.tab) ? query.tab : undefined;

  const result = await getNotifications(tab);
  const counts = result.categoryCounts ?? {};
  const unread = result.unreadCount ?? 0;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="notifications" />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="bg-base border-line flex flex-col rounded-16 border">
              {/* Hdr — 651:1568 */}
              <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[16px] font-bold">{t("title")}</h2>
                  {unread > 0 && (
                    <span className="bg-error flex h-[22px] items-center rounded-[11px] px-2 text-[10px] font-bold text-white">
                      {t("new", { count: unread })}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <form action={markAllReadAction}>
                    <input type="hidden" name="locale" value={locale} />
                    {tab && <input type="hidden" name="category" value={tab} />}
                    <button
                      type="submit"
                      className="text-action text-[12px] font-medium"
                    >
                      {t("markAllRead")}
                    </button>
                  </form>
                )}
              </div>

              {/* Tabs — 651:1574 */}
              <div className="flex h-[42px] items-center overflow-x-auto ps-3">
                <NotificationTab
                  href="/account/notifications"
                  label={t("tabs.all")}
                  count={counts.all}
                  active={!tab}
                />
                {NOTIFICATION_CATEGORIES.map((category) => (
                  <NotificationTab
                    key={category}
                    href={`/account/notifications?tab=${category}`}
                    label={t(`tabs.${category}`)}
                    count={counts[category]}
                    active={tab === category}
                  />
                ))}
              </div>

              <div className="bg-fill-100 h-px w-full" />

              {result.items.length === 0 ? (
                <div className="p-14 text-center">
                  <p className="text-body-lg mb-2">{t("emptyTitle")}</p>
                  <p className="text-body text-ink-secondary">
                    {t("emptyBody")}
                  </p>
                </div>
              ) : (
                result.items.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <div className="bg-fill-100 h-px w-full" />}
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
                      viewLabel={t("view")}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

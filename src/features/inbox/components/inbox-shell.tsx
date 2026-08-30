import { getTranslations, getFormatter } from "next-intl/server";
import { Mail, MessagesSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getConversation,
  getConversations,
  getMessages,
  getUnreadCount,
} from "@/lib/api/endpoints/conversations";
import {
  INBOX_FILTERS,
  isInboxFilter,
  type InboxFilter,
} from "@/lib/api/schemas/conversation";
import { requireUser } from "@/lib/auth/current-user";
import { markReadAction } from "../actions";
import { ConversationList } from "./conversation-list";
import { MessageThread } from "./message-thread";

/**
 * Inbox — Figma `651:6796` (Web_Inbox) and `651:6902` (Web_Inbox_Empty).
 *
 * One shell behind `/inbox` and `/inbox/[id]`, because the design is a
 * two-pane layout: the rail is on screen whether or not a thread is open.
 *
 * The filter chips come from the empty frame — the populated frame does not
 * draw them, but they map to `GET /conversations?filter=` and dropping them
 * would leave the filter unreachable exactly when there is something to filter
 * (plans/09 C40).
 */
export async function InboxShell({
  locale,
  activeId,
  query,
}: {
  locale: string;
  activeId: string | null;
  query: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser(
    locale,
    activeId ? `/inbox/${activeId}` : "/inbox",
  );

  const t = await getTranslations("Inbox");
  const format = await getFormatter();

  const filter: InboxFilter =
    typeof query.filter === "string" && isInboxFilter(query.filter)
      ? query.filter
      : "all";
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const error = typeof query.error === "string" ? query.error : null;

  const [list, unread] = await Promise.all([
    getConversations(filter, search || undefined),
    getUnreadCount(),
  ]);

  const [conversation, messages] = activeId
    ? await Promise.all([getConversation(activeId), getMessages(activeId)])
    : [null, []];

  // Opening a thread is what marks it read; the rail's badge follows.
  if (conversation) await markReadAction(conversation.id, locale);

  const noConversations = list.items.length === 0 && !search && filter === "all";

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-14 lg:px-20">
        {/* PH — 651:6797 */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-ink-900 text-[28px] font-bold">{t("title")}</h1>
          {unread > 0 && (
            <span className="bg-error text-base flex h-7 items-center justify-center rounded-[14px] px-3 text-[12px] font-bold">
              {t("unread", { count: unread })}
            </span>
          )}
        </div>

        {/* chips — 651:6910 */}
        <div className="flex flex-wrap gap-2.5">
          {INBOX_FILTERS.map((key) => {
            const active = key === filter;
            return (
              <Link
                key={key}
                href={key === "all" ? "/inbox" : `/inbox?filter=${key}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center justify-center rounded-20 px-3.5 text-[13px] font-semibold ${
                  active
                    ? "bg-aqua text-on-accent"
                    : "bg-surface border-line text-ink border"
                }`}
              >
                {t(`filters.${key}`)}
              </Link>
            );
          })}
        </div>

        {noConversations ? (
          /* empty — 651:6918 */
          <div className="bg-base border-line flex min-h-[460px] flex-col items-center justify-center rounded-16 border px-6 text-center">
            <span className="bg-fill-100 text-ink-tertiary flex size-20 items-center justify-center rounded-full">
              <Mail className="size-8" aria-hidden />
            </span>
            <p className="text-ink mt-6 text-[18px] font-semibold">
              {t("emptyTitle")}
            </p>
            <p className="text-ink-secondary mt-2 text-[14px]">
              {t("emptyBody")}
            </p>
            <Link
              href="/products"
              className="bg-aqua text-on-accent mt-6 flex h-[46px] w-[180px] items-center justify-center rounded-12 text-[15px] font-semibold"
            >
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          /* ChatLayout — 651:6801 */
          <div className="bg-base border-line-200 flex h-[640px] flex-col items-stretch overflow-hidden rounded-16 border lg:flex-row lg:items-start">
            <ConversationList
              rows={list.items}
              activeId={activeId}
              basePath={`/${locale}/inbox`}
              filter={filter}
              labels={{
                search: t("search"),
                searchPlaceholder: t("searchPlaceholder"),
                empty: search ? t("noMatches") : t("noneInFilter"),
                age: {
                  now: t("age.now"),
                  min: t("age.min"),
                  hr: t("age.hr"),
                  yesterday: t("age.yesterday"),
                  days: t("age.days"),
                },
              }}
            />

            {/* Vdiv — 651:6864 */}
            <span
              className="bg-line-200 hidden h-full w-px shrink-0 lg:block"
              aria-hidden
            />

            {conversation ? (
              <MessageThread
                conversation={conversation}
                messages={messages}
                viewerId={user.id}
                locale={locale}
                error={error}
                labels={{
                  online: t("online"),
                  offline: t("offline"),
                  placeholder: t("composerPlaceholder"),
                  send: t("send"),
                  attachmentBlocked: t("attachmentBlocked"),
                  error: error ? t(`errors.${error}`) : null,
                  time: (iso) =>
                    format.dateTime(new Date(iso), { timeStyle: "short" }),
                }}
              />
            ) : (
              <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 p-10 text-center lg:flex">
                <MessagesSquare className="text-ink-400 size-8" aria-hidden />
                <p className="text-ink-400 text-[13px]">{t("pickThread")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

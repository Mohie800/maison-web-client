import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ConversationRow } from "@/lib/api/schemas/conversation";
import { resolveMediaUrl } from "@/lib/api/media";
import { avatarTint, initials, shortAge } from "../helpers";

/**
 * The 340px conversation rail — `651:6802`.
 *
 * The search field is a GET form on the inbox route: `GET /conversations`
 * takes `q`, which searches listing title and participant name.
 */
export function ConversationList({
  rows,
  activeId,
  basePath,
  filter,
  labels,
}: {
  rows: ConversationRow[];
  activeId: string | null;
  basePath: string;
  filter: string;
  labels: {
    search: string;
    searchPlaceholder: string;
    empty: string;
    age: {
      now: string;
      min: string;
      hr: string;
      yesterday: string;
      days: string;
    };
  };
}) {
  return (
    <div className="flex w-full shrink-0 flex-col lg:w-[340px]">
      {/* Srch — 651:6803 */}
      <form
        action={basePath}
        className="bg-fill-50 border-line-200 flex h-12 w-full shrink-0 items-center gap-2 border px-4"
      >
        {filter !== "all" && (
          <input type="hidden" name="filter" value={filter} />
        )}
        <Search className="text-ink-400 size-3.5 shrink-0" aria-hidden />
        <input
          name="q"
          placeholder={labels.searchPlaceholder}
          aria-label={labels.search}
          className="text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-ink-400 px-4 py-8 text-center text-[12px]">
            {labels.empty}
          </p>
        ) : (
          rows.map((row) => {
            const active = row.id === activeId;
            const name = row.otherUser?.fullName ?? row.listing?.title ?? "";
            const avatar = resolveMediaUrl(row.otherUser?.profilePic);
            const unread = row.unreadCount ?? 0;

            return (
              <div key={row.id}>
                {/* Conv — 651:6806 */}
                <Link
                  href={`/inbox/${row.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 ${
                    active ? "bg-success-tint" : "hover:bg-fill-50"
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-20 text-[12px] font-bold ${avatarTint(
                      row.otherUser?.id,
                    )}`}
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img src={avatar} alt="" className="size-full object-cover" />
                    ) : (
                      initials(name)
                    )}
                  </span>

                  {/* CI — 651:6809 */}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`truncate text-[13px] font-semibold ${
                        active ? "text-action" : "text-ink-900"
                      }`}
                      dir="auto"
                    >
                      {name}
                    </span>
                    <span
                      className="text-ink-400 truncate text-[11px]"
                      dir="auto"
                    >
                      {row.lastMessagePreview ?? row.listing?.title ?? ""}
                    </span>
                  </span>

                  {/* CR — 651:6812 */}
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-ink-400 text-[10px]">
                      {shortAge(row.lastMessageAt, labels.age)}
                    </span>
                    {unread > 0 && (
                      <span className="bg-error text-base flex size-5 items-center justify-center rounded-10 text-[9px] font-bold">
                        {unread}
                      </span>
                    )}
                  </span>
                </Link>
                <span className="bg-fill-100 block h-px w-full" aria-hidden />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

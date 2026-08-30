import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Offset pagination — `Pgn` on Web_PLP, `651:4162`.
 *
 * Every control is the same 34px box: white with a `t/border-200` hairline,
 * 8px corners, `t/ink-700` at 12px. The current page inverts to `t/ink-900`
 * with white bold. The ellipsis is one of those boxes too, not a bare glyph.
 *
 * The API returns `{ items, total, page, limit }` with no `hasMore`, so the
 * page count is derived.
 *
 * Takes an `href` builder rather than a filter object: the PLP pages by filter
 * state, the seller profile pages two independent tabs under one route, and
 * both want the same control. Whatever a surface's URL shape is, it owns it.
 */
export async function Pagination({
  page,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const t = await getTranslations("Catalog");
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const current = Math.min(page, pageCount);
  const pages = pageNumbers(current, pageCount);

  return (
    <nav
      aria-label={t("pagination")}
      className="mt-6 flex items-center justify-center gap-1.5 pt-2"
    >
      <PageLink
        href={buildHref(current - 1)}
        disabled={current <= 1}
        label={t("previous")}
      >
        {/* Direction-aware: in Arabic "previous" points right. */}
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
      </PageLink>

      {pages.map((n, i) =>
        n === "…" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="border-line-200 bg-base text-ink-700 flex size-[34px] items-center justify-center rounded-8 border text-[12px]"
          >
            …
          </span>
        ) : (
          <Link
            key={n}
            href={buildHref(n)}
            aria-current={n === current ? "page" : undefined}
            className={`flex size-[34px] items-center justify-center rounded-8 text-[12px] ${
              n === current
                ? "bg-ink-900 text-base font-bold"
                : "bg-base border-line-200 text-ink-700 border"
            }`}
          >
            {n}
          </Link>
        ),
      )}

      <PageLink
        href={buildHref(current + 1)}
        disabled={current >= pageCount}
        label={t("next")}
      >
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="bg-base border-line-200 text-ink-700 flex size-[34px] items-center justify-center rounded-8 border opacity-40"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="bg-base border-line-200 text-ink-700 flex size-[34px] items-center justify-center rounded-8 border"
    >
      {children}
    </Link>
  );
}

/** 1 … 4 [5] 6 … 12 — always shows first, last, and the current neighbourhood. */
function pageNumbers(current: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < pageCount) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];

  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push("…");
    out.push(page);
  });

  return out;
}

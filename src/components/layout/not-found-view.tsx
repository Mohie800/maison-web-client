import { Link } from "@/i18n/navigation";

/**
 * Web_404_Error — `651:16393`.
 *
 * Shared by the locale-scoped `not-found.tsx` and the root one, so a bad URL
 * inside the app and a bad URL outside it look the same. The root copy cannot
 * read translations — there is no locale to read them in — so both take their
 * words as props.
 */
export function NotFoundView({
  labels,
  homeHref = "/",
  categoriesHref = "/categories",
}: {
  labels: {
    code: string;
    title: string;
    body: string;
    body2: string;
    home: string;
    categories: string;
  };
  homeHref?: string;
  categoriesHref?: string;
}) {
  return (
    <div className="bg-surface flex flex-col items-center justify-center px-4 py-[100px]">
      {/* Center404 — 651:16394 */}
      <div className="flex w-full max-w-[560px] flex-col items-center gap-5">
        <p className="text-line-200 text-center text-[96px] leading-none font-bold">
          {labels.code}
        </p>
        <h1 className="text-ink-900 text-center text-[32px] font-bold">
          {labels.title}
        </h1>
        <p className="text-ink-500 text-center text-[16px]">
          {labels.body}
          <br />
          {labels.body2}
        </p>

        {/* Btns404 — 651:16398 */}
        <div className="flex flex-wrap items-start justify-center gap-3">
          <Link
            href={homeHref}
            className="bg-action text-base flex h-12 items-center justify-center rounded-[24px] px-7 text-[14px] font-bold"
          >
            {labels.home}
          </Link>
          <Link
            href={categoriesHref}
            className="border-line-200 text-ink-900 flex h-12 items-center justify-center rounded-[24px] border px-7 text-[14px] font-medium"
          >
            {labels.categories}
          </Link>
        </div>
      </div>
    </div>
  );
}

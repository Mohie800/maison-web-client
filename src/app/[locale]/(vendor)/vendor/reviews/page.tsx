import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSellerReviews } from "@/lib/api/endpoints/sellers";
import { resolveMediaUrl } from "@/lib/api/media";
import { Stars } from "@/features/vendor/components/stars";
import { replyToReviewAction } from "@/features/vendor/actions";

/**
 * Reviews — `651:15220` light / `651:12629` dark.
 *
 * Round 9 added `startDate`/`endDate` here (GAP-114), and the `summary` block
 * respects the window too — so the average above the list matches the reviews
 * under it. The frame's four time pills are real now.
 *
 * `filter` (`all | with_photos | verified`) is a separate axis and still works;
 * the screen offers the time windows the frame draws, since that is what it
 * asks for (plans/09 C77).
 *
 * Reply is inline rather than a separate screen. `14_VP_ReviewDetail` shows one
 * review with a reply box and nothing the row does not already have, and the
 * API allows exactly one reply per review with no edit, so a round trip to a
 * detail page buys nothing.
 */
export const metadata: Metadata = { robots: { index: false } };

/** The frame's pills — `651:15282`. Real since GAP-114. */
const WINDOWS = ["all", "3m", "30d", "7d"] as const;
type Window = (typeof WINDOWS)[number];

const WINDOW_DAYS: Record<Exclude<Window, "all">, number> = {
  "3m": 90,
  "30d": 30,
  "7d": 7,
};

export default async function VendorReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ window?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { window: rawWindow, page: rawPage } = await searchParams;
  const active: Window = (WINDOWS as readonly string[]).includes(rawWindow ?? "")
    ? (rawWindow as Window)
    : "all";
  const page = Math.max(1, Number(rawPage) || 1);

  /* Dates, not day counts — the endpoint takes a window like the rest. */
  const range =
    active === "all"
      ? {}
      : (() => {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - (WINDOW_DAYS[active] - 1));
          const iso = (d: Date) => d.toISOString().slice(0, 10);
          return { startDate: iso(start), endDate: iso(end) };
        })();

  const t = await getTranslations("Vendor.reviews");
  const user = await getCurrentUser();

  const data = user
    ? await getSellerReviews(user.id, { ...range, page, limit: 20 }).catch(
        () => null,
      )
    : null;

  const summary = data?.summary;
  const total = summary?.total ?? 0;
  const average = Number(summary?.average ?? 0);
  const distribution = summary?.distribution ?? {};

  return (
    <>
      {/* TB13 — 651:15271 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
            {t("title")}
          </h1>
          {total > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="text-warning text-[28px] font-bold" dir="ltr">
                {average.toFixed(1)}
              </span>
              <Stars rating={average} size={14} />
            </div>
          )}
        </div>

        {/* T13 — 651:15282 */}
        <div className="border-line-200 flex h-10 items-center gap-1 rounded-[20px] border px-1">
          {WINDOWS.map((key) => (
            <Link
              key={key}
              href={`/vendor/reviews?window=${key}`}
              aria-current={key === active ? "page" : undefined}
              className={`flex h-8 items-center rounded-[16px] px-3.5 text-[11px] ${
                key === active
                  ? "bg-vp-action border-action text-action dark:text-aqua border font-semibold"
                  : "border-line-200 text-ink-500 dark:text-ink-450 border"
              }`}
            >
              {t(`windows.${key}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* RBrk — 651:15291 */}
      {total > 0 && (
        <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-6 border px-5 py-4 md:flex-row md:items-start">
          <div className="flex shrink-0 flex-col items-center justify-center gap-1.5">
            <p className="text-warning text-[48px] leading-none font-bold" dir="ltr">
              {average.toFixed(1)}
            </p>
            <Stars rating={average} />
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("count", { count: total })}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[String(star)] ?? 0;
              /* Counts, not money — the share is safe to derive. */
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2.5">
                  <span className="text-ink-500 dark:text-ink-450 w-[52px] shrink-0 text-[11px]">
                    {t("stars", { count: star })}
                  </span>
                  <span className="bg-fill-100 h-2 w-[200px] shrink-0 overflow-hidden rounded-[4px]">
                    <span
                      className="bg-warning block h-2 rounded-[4px]"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span
                    className="text-ink-500 dark:text-ink-450 text-[11px]"
                    dir="ltr"
                  >
                    {t("distribution", { count, percent })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(data?.items ?? []).length === 0 ? (
        <p className="bg-base dark:bg-tint border-line-200 text-ink-500 dark:text-ink-450 rounded-12 border px-4 py-8 text-center text-[13px]">
          {t("empty")}
        </p>
      ) : (
        (data?.items ?? []).map((review) => {
          const avatar = resolveMediaUrl(review.buyer?.profilePic);
          const initials = (review.buyer?.fullName ?? "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            /* Rev — 651:15327 */
            <section
              key={review.id}
              className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-2.5 border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-vp-info text-info flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-[11px] font-bold">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img src={avatar} alt="" className="size-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <p
                      className="text-ink-900 truncate text-[13px] font-semibold"
                      dir="auto"
                    >
                      {review.buyer?.fullName}
                    </p>
                    {review.buyer?.username && (
                      <p
                        className="text-ink-500 dark:text-ink-450 truncate text-[10px]"
                        dir="ltr"
                      >
                        @{review.buyer.username}
                      </p>
                    )}
                  </div>
                </div>
                <Stars rating={Number(review.rating ?? 0)} />
              </div>

              {review.comment && (
                <p
                  className="text-ink-500 dark:text-ink-450 text-[13px]"
                  dir="auto"
                >
                  {review.comment}
                </p>
              )}

              {(review.photos ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(review.photos ?? []).map((photo) => (
                    <span
                      key={photo}
                      className="bg-fill-100 rounded-8 size-16 overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12 */}
                      <img
                        src={resolveMediaUrl(photo) ?? ""}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
              )}

              {/* RB2 — 651:15342 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className="text-ink-500 dark:text-ink-450 min-w-0 truncate text-[11px]"
                  dir="auto"
                >
                  {review.purchasedTitle}
                </p>
                {review.sellerReply && (
                  <span className="bg-vp-action text-action dark:text-aqua flex h-8 shrink-0 items-center rounded-8 px-3.5 text-[11px] font-bold">
                    {t("replied")}
                  </span>
                )}
              </div>

              {review.sellerReply ? (
                <div className="bg-vp-panel border-line-200 rounded-8 flex flex-col gap-1 border p-3">
                  <p className="text-ink-900 text-[11px] font-semibold">
                    {t("yourReply")}
                  </p>
                  <p
                    className="text-ink-500 dark:text-ink-450 text-[12px]"
                    dir="auto"
                  >
                    {review.sellerReply}
                  </p>
                </div>
              ) : (
                /* RPBtn — 651:15344, expanded inline. One reply, no edit. */
                <form
                  action={replyToReviewAction}
                  className="flex flex-col items-start gap-2"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={review.id} />
                  <textarea
                    name="reply"
                    required
                    rows={2}
                    dir="auto"
                    placeholder={t("replyPlaceholder")}
                    className="border-line-200 bg-base dark:bg-fill-50 text-ink-900 rounded-8 w-full border p-3 text-[12px]"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="border-action text-action dark:text-aqua rounded-8 flex h-8 items-center border px-3.5 text-[11px] font-bold"
                    >
                      {t("send")}
                    </button>
                    <span className="text-ink-500 dark:text-ink-450 text-[10px]">
                      {t("onceOnly")}
                    </span>
                  </div>
                </form>
              )}
            </section>
          );
        })
      )}
    </>
  );
}

import { Star, BadgeCheck, ThumbsUp } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount } from "@/lib/format/money";
import type { SellerReview } from "@/lib/api/schemas/seller";
import type { Locale } from "@/i18n/routing";

/**
 * Reviews tab — the "Seller Reviews" content from `651:9083`.
 *
 * `summary` is computed by the backend per request, so the average and the
 * star distribution here are real even where the seller's own `ratingAvg` is
 * null (GAP-36).
 *
 * "Helpful" is a count, not a control: marking a review helpful is a mutation
 * that needs a session, so the number is shown and the button isn't.
 */
export async function SellerReviews({
  summary,
  reviews,
  total,
}: {
  summary: {
    average?: number | null;
    total?: number | null;
    distribution?: Record<string, number> | null;
  } | null;
  reviews: SellerReview[];
  total: number;
}) {
  const t = await getTranslations("Seller");
  const locale = (await getLocale()) as Locale;

  if (total === 0 || reviews.length === 0) {
    return (
      <div className="border-line rounded-16 border p-10 text-center">
        <p className="text-label">{t("reviewsEmptyTitle")}</p>
        <p className="text-body text-ink-tertiary mt-1">{t("reviewsEmptyBody")}</p>
      </div>
    );
  }

  const average = summary?.average ?? null;
  const distribution = summary?.distribution ?? null;
  const distTotal = summary?.total ?? total;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Summary rail */}
      <aside className="border-line flex w-full shrink-0 flex-col gap-4 rounded-16 border p-6 lg:w-[260px]">
        {average !== null && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[40px] leading-none font-bold">
              {average.toFixed(1)}
            </span>
            <span className="flex gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-4 ${
                    n <= Math.round(average)
                      ? "fill-current text-accent-gold"
                      : "text-ink-tertiary"
                  }`}
                />
              ))}
            </span>
            <span className="text-caption text-ink-tertiary">
              {t("reviewCount", { count: distTotal })}
            </span>
          </div>
        )}

        {distribution && (
          <ul className="flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[String(star)] ?? 0;
              const pct = distTotal ? Math.round((count / distTotal) * 100) : 0;
              return (
                <li key={star} className="flex items-center gap-2">
                  <span className="text-caption text-ink-tertiary w-3 text-end">
                    {star}
                  </span>
                  <Star className="text-accent-gold size-3 fill-current" aria-hidden />
                  <span className="bg-tint h-1.5 flex-1 overflow-hidden rounded-full">
                    <span
                      className="bg-accent-gold block h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-caption text-ink-tertiary w-6 text-end tabular-nums">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Review list */}
      <ul className="flex min-w-0 flex-1 flex-col gap-6">
        {reviews.map((review) => {
          const buyerName = review.buyer?.username ?? review.buyer?.fullName;
          const buyerAvatar = resolveMediaUrl(review.buyer?.profilePic);
          return (
            <li key={review.id} className="border-line rounded-16 border p-5">
              <div className="flex items-start gap-3">
                {buyerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={buyerAvatar}
                    alt=""
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="bg-tint text-caption text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full"
                    aria-hidden
                  >
                    {(buyerName ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label">{buyerName}</span>
                    {review.verifiedBuyer && (
                      <span className="text-caption text-action flex items-center gap-1">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        {t("verifiedBuyer")}
                      </span>
                    )}
                    <span className="flex gap-0.5" aria-label={String(review.rating)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-3.5 ${
                            n <= review.rating
                              ? "fill-current text-accent-gold"
                              : "text-ink-tertiary"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </span>
                  </div>

                  {review.purchasedTitle && (
                    <p className="text-caption text-ink-tertiary" dir="auto">
                      {t("purchased", { title: review.purchasedTitle })}
                    </p>
                  )}

                  {review.comment && (
                    <p className="text-body text-ink-secondary" dir="auto">
                      {review.comment}
                    </p>
                  )}

                  {review.photos && review.photos.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {review.photos.map((photo) => (
                        <li key={photo}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveMediaUrl(photo) ?? ""}
                            alt=""
                            className="size-16 rounded-10 object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {review.tags && review.tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {review.tags.map((tag) => (
                        <li
                          key={tag}
                          className="bg-tint text-caption text-ink-secondary rounded-[12px] px-2.5 py-1"
                        >
                          {/* Tags are backend enums; unknown ones fall back to the raw value. */}
                          {t.has(`reviewTags.${tag}`) ? t(`reviewTags.${tag}`) : tag}
                        </li>
                      ))}
                    </ul>
                  )}

                  {review.sellerReply && (
                    <div className="border-line bg-surface mt-1 rounded-12 border p-3">
                      <p className="text-caption text-ink-tertiary">
                        {t("sellerReplied")}
                      </p>
                      <p className="text-body text-ink-secondary mt-1" dir="auto">
                        {review.sellerReply}
                      </p>
                    </div>
                  )}

                  {(review.helpfulCount ?? 0) > 0 && (
                    <p className="text-caption text-ink-tertiary flex items-center gap-1.5">
                      <ThumbsUp className="size-3.5" aria-hidden />
                      {t("helpfulCount", {
                        count: formatCount(review.helpfulCount ?? 0, locale),
                      })}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/format/date";
import { resolveMediaUrl } from "@/lib/api/media";
import type { SellerReview } from "@/lib/api/schemas/seller";
import type { Locale } from "@/i18n/routing";

/**
 * The PDP's fourth tab — Figma `651:4420` ("Seller Reviews").
 *
 * It was absent until `GET /reviews/listings/{id}` became public (GAP-71); the
 * page showed a rating and a count in its header and had nothing behind them.
 *
 * The seller-profile tab is the same row with two extras this endpoint does not
 * send — a verified-buyer mark and the purchased title. Neither is missed here:
 * everyone reviewing a listing bought that listing, and the title is the page.
 *
 * "Helpful" stays a count rather than a control, as it is on the profile:
 * marking one helpful is a mutation that needs a session.
 */
export async function ProductReviews({
  reviews,
  total,
}: {
  reviews: SellerReview[];
  total: number;
}) {
  const t = await getTranslations("Pdp");
  const tSeller = await getTranslations("Seller");
  const locale = (await getLocale()) as Locale;

  if (total === 0 || reviews.length === 0) {
    return (
      <p className="text-body text-ink-tertiary max-w-[760px]">
        {t("reviewsEmpty")}
      </p>
    );
  }

  return (
    <ul className="flex max-w-[760px] flex-col gap-6">
      {reviews.map((review) => {
        const name = review.buyer?.username ?? review.buyer?.fullName;
        const avatar = resolveMediaUrl(review.buyer?.profilePic);
        return (
          <li key={review.id} className="border-line rounded-16 border p-5">
            <div className="flex items-start gap-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={avatar}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="bg-tint text-caption text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full"
                  aria-hidden
                >
                  {(name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label">{name}</span>
                  <span
                    className="flex gap-0.5"
                    aria-label={String(review.rating)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-3.5 ${
                          n <= review.rating
                            ? "text-accent-gold fill-current"
                            : "text-ink-tertiary"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </span>
                  {review.createdAt && (
                    <span className="text-caption text-ink-tertiary ms-auto">
                      {formatDate(review.createdAt, locale)}
                    </span>
                  )}
                </div>

                {review.comment && (
                  <p className="text-body text-ink-secondary" dir="auto">
                    {review.comment}
                  </p>
                )}

                {review.photos && review.photos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {review.photos.map((photo) => (
                      <li key={photo}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12 */}
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
                        className="bg-tint text-ink-secondary rounded-[11px] px-2.5 py-1 text-[11px]"
                      >
                        {tSeller.has(`reviewTags.${tag}`)
                          ? tSeller(`reviewTags.${tag}`)
                          : tag.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                )}

                {review.sellerReply && (
                  <div className="bg-surface rounded-12 p-3.5">
                    <p className="text-caption text-ink-tertiary">
                      {tSeller("sellerReplied")}
                    </p>
                    <p className="text-body text-ink-secondary mt-1" dir="auto">
                      {review.sellerReply}
                    </p>
                  </div>
                )}

                {review.helpfulCount != null && review.helpfulCount > 0 && (
                  <p className="text-caption text-ink-tertiary">
                    {tSeller("helpfulCount", { count: review.helpfulCount })}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOrder, getReviewableItems } from "@/lib/api/endpoints/orders";
import { getListing } from "@/lib/api/endpoints/listings";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import {
  COMMENT_MAX,
  PHOTOS_MAX,
  RATING_MAX,
  REVIEW_TAGS,
  type ReviewableItem,
} from "@/lib/api/schemas/review";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { StarRatingInput } from "@/features/reviews/components/star-rating-input";
import { submitReviewAction } from "@/features/reviews/actions";

/**
 * Write a review — Figma `651:8696`, with `651:8751` as the submitted state.
 *
 * `GET /reviews/orders/{id}/reviewable` returns only delivered, not-yet-
 * reviewed items, so an order with nothing to review 404s rather than showing
 * a form that would be rejected.
 *
 * Two deviations, recorded in plans/09 C34:
 *
 * - The frame's three sub-ratings (Item as described / Shipping speed /
 *   Communication) have no fields. `CreateReviewDto` models the same ground as
 *   a closed set of six `tags`, two of which are those exact dimensions, so we
 *   render the tags. Sub-rating stars would post nowhere.
 * - The four photo tiles upload through `POST /media`, which turns each file
 *   into the path `photos` takes (GAP-72).
 *   removed, so the missing capability is obvious.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function WriteReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Review");
  const query = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : null;
  const error = one(query.error);
  const submitted = Number(one(query.submitted) ?? NaN);

  const [reviewable, order] = await Promise.all([
    getReviewableItems(id),
    getOrder(id).catch(() => null),
  ]);

  if (submitted >= 1 && submitted <= RATING_MAX) {
    // The reviewed item has already dropped out of `reviewable`, so the
    // confirmation names it from the id the redirect carried.
    return (
      <Submitted
        rating={submitted}
        locale={locale}
        title={one(query.title)}
        t={t}
      />
    );
  }

  const item = reviewable.items[0];
  if (!item) notFound();

  // `@handle` only when there is a handle — the endpoint leaves `username`
  // null on most accounts, and "@R3 Seller" is not a handle.
  const sellerName = item.seller?.username
    ? `@${item.seller.username}`
    : (item.seller?.fullName ?? t("theSeller"));

  // The reviewable payload carries no photo, so the strip's thumbnail
  // (651:8715) comes from the listing itself (GAP-70).
  const listing = item.listingId
    ? await getListing(item.listingId).catch(() => null)
    : null;
  const photo = resolveMediaUrl(
    item.coverPhotoUrl ?? (listing ? coverPhotoUrl(listing) : null),
  );
  const reference = order?.orderNumber ?? null;

  return (
    <div className="bg-surface pb-14">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-12">
        <h1 className="text-[26px] leading-[36.4px] font-bold">{t("title")}</h1>
        <p className="text-ink-secondary mt-1 text-[14px]" dir="auto">
          {t("subtitle", { seller: sellerName })}
        </p>

        {/* card — 651:8713 */}
        <form
          action={submitReviewAction}
          className="bg-base border-line mt-5 flex flex-col gap-6 rounded-20 border p-6 shadow-[0_8px_12px_rgba(0,0,0,0.05)]"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={id} />
          <input type="hidden" name="orderItemId" value={item.orderItemId} />

          {/* strip — 651:8714 */}
          <div className="bg-surface flex items-center gap-4 rounded-12 p-4">
            <span className="bg-tint size-13 shrink-0 overflow-hidden rounded-10">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img src={photo} alt="" className="size-full object-cover" />
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[14px] font-semibold" dir="auto">
                {item.title}
              </span>
              <span className="text-ink-secondary text-[12px]">
                {[
                  reference ? t("orderRef", { number: reference }) : null,
                  item.price != null
                    ? formatPrice(item.price, order?.currency ?? "SAR")
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </div>

          <StarRatingInput
            legend={t("overall")}
            labels={[
              t("scale.1"),
              t("scale.2"),
              t("scale.3"),
              t("scale.4"),
              t("scale.5"),
            ]}
          />

          {/* Stands in for the frame's three sub-ratings — plans/09 C34 */}
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 text-[14px] font-semibold">
              {t("tagsLegend")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="border-line text-ink-secondary has-checked:border-action has-checked:bg-action-tint has-checked:text-action flex cursor-pointer items-center gap-2 rounded-10 border px-3 py-2 text-[13px] font-medium"
                >
                  <input
                    type="checkbox"
                    name="tags"
                    value={tag}
                    className="sr-only"
                  />
                  {t(`tags.${tag}`)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* note — 651:8737 */}
          <label className="flex flex-col gap-2.5">
            <span className="text-[14px] font-semibold">{t("yourReview")}</span>
            <textarea
              name="comment"
              rows={5}
              maxLength={COMMENT_MAX}
              placeholder={t("commentPlaceholder")}
              dir="auto"
              className="border-line text-ink-900 min-h-[130px] rounded-12 border p-4 text-[14px] outline-none"
            />
            <span className="text-ink-tertiary text-[11px]">
              {t("commentLimit", { max: COMMENT_MAX })}
            </span>
          </label>

          {/*
            photo tiles — 651:8740. Plain file inputs under labels, so they
            work with the script off and post with the rest of the form.
          */}
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2 text-[13px] font-semibold">
              {t("addPhotos")}
            </legend>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: PHOTOS_MAX }, (_, index) => (
                <label
                  key={index}
                  className="bg-surface border-line text-ink-tertiary flex size-24 cursor-pointer items-center justify-center rounded-12 border-[1.5px] border-dashed text-[20px] font-bold"
                >
                  +
                  <input
                    type="file"
                    name="photos"
                    accept="image/*"
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
            <p className="text-ink-tertiary text-[11px]">
              {t("photosHint", { max: PHOTOS_MAX })}
            </p>
          </fieldset>

          {error && (
            <p className="text-error text-[13px] font-medium" role="alert">
              {t(`errors.${error}` as "errors.requestFailed")}
            </p>
          )}

          <button
            type="submit"
            className="bg-aqua text-on-accent flex h-[50px] items-center justify-center rounded-12 text-[15px] font-semibold"
          >
            {t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Web_Review_Submitted — 651:8751. */
function Submitted({
  rating,
  locale,
  title,
  t,
}: {
  rating: number;
  locale: string;
  title: string | null;
  t: Awaited<ReturnType<typeof getTranslations<"Review">>>;
}) {
  void locale;
  return (
    <div className="bg-surface flex justify-center px-4 pt-16 pb-14">
      <div className="bg-base border-line-subtle flex w-full max-w-[560px] flex-col items-center gap-4 rounded-20 border p-10 text-center shadow-[0_16px_20px_rgba(0,0,0,0.08)]">
        <span className="bg-success-tint text-success flex size-18 items-center justify-center rounded-full">
          <Check className="size-8" aria-hidden />
        </span>
        <h1 className="text-[24px] font-bold">{t("thanksTitle")}</h1>
        <p className="text-ink-secondary max-w-[440px] text-[14px]">
          {t("thanksBody")}
        </p>
        <p className="text-gold text-[20px] font-bold" aria-hidden>
          {"★ ".repeat(rating).trim()}
        </p>
        <p className="sr-only">{t("ratingOf", { rating, max: RATING_MAX })}</p>
        {title && (
          <p className="bg-surface w-full truncate rounded-12 p-4 text-[13px] font-semibold">
            {title}
          </p>
        )}
        <Link
          href="/account/orders"
          className="bg-aqua text-on-accent mt-2 flex h-12 w-full items-center justify-center rounded-12 text-[15px] font-semibold"
        >
          {t("backToOrders")}
        </Link>
      </div>
    </div>
  );
}

export type { ReviewableItem };

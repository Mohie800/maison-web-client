import { Heart } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { addToBagAction, buyNowAction } from "@/features/checkout/quick-actions";
import {
  cardAmount,
  isAuctionCard,
  type ProductCard as ProductCardData,
} from "@/lib/api/schemas/cards";

/**
 * The listing card used across the storefront — home rails, PLP, search,
 * seller profiles. Built once here because Phase 3 onwards reuses it
 * everywhere; changing the card should change every surface at once.
 */

/**
 * Condition pill tones. The design splits these three ways: green for anything
 * new-or-near-new, amber for "good", neutral for "fair".
 *
 * The amber pair is literal because the token set has no amber tint — only
 * `accent-gold` (#F6C90E), which is a fill colour and far too light to read as
 * text. Worth promoting to a token if a second surface needs it.
 */
const CONDITION_TONE: Record<string, string> = {
  new: "bg-action-tint text-action",
  new_with_tags: "bg-action-tint text-action",
  new_without_tags: "bg-action-tint text-action",
  like_new: "bg-action-tint text-action",
  good: "bg-[#FEF3C7] text-[#92400E]",
  fair: "bg-tint text-ink-secondary",
};

export async function ProductCard({
  card,
  priority = false,
  badge,
}: {
  card: ProductCardData;
  priority?: boolean;
  /** Corner label, e.g. "NEW" on the Just Listed rail (Figma 651:1131). */
  badge?: string;
}) {
  const t = await getTranslations("Listing");
  const tCommon = await getTranslations("Common");
  const locale = await getLocale();

  const image = resolveMediaUrl(card.coverPhotoUrl ?? card.photoUrls?.[0]);
  const conditionKey = card.condition ?? "";
  const tone = CONDITION_TONE[conditionKey] ?? "bg-tint text-ink-secondary";
  const isAuction = isAuctionCard(card);

  return (
    <article className="bg-base border-line group flex flex-col overflow-hidden rounded-12 border">
      <Link
        href={`/products/${card.id}`}
        className="bg-surface relative block aspect-square overflow-hidden"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing photos come from the API origin and seeded external hosts; see plans/06 G12
          <img
            src={image}
            alt={card.title}
            loading={priority ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="bg-tint size-full" />
        )}

        {/*
          The corner slot holds one label. Where a rail supplies its own — the
          "NEW" flag on Just Listed — that wins: the design shows it on every
          card in that rail, with no discount percentage anywhere on it.
          Elsewhere the slot falls back to the discount badge.
        */}
        {badge ? (
          /*
            A corner tag, not an inset pill: it sits flush in the card's
            top-start corner and only its bottom-end corner is rounded — the
            curve on the other side is the card's own radius clipping it, which
            is why this relies on the article's `overflow-hidden`.

            `#111827` is `t/ink-900`'s light value, written literally because
            the token inverts to near-white in dark mode and this tag has to
            stay dark on top of a photo either way. `text-aqua` is safe as a
            token — `accent-aqua` holds #56F1A3 in both themes.
          */
          <span className="rounded-ee-12 text-aqua absolute top-0 start-0 flex h-7 items-center bg-[#111827] px-3 text-[11px] font-bold tracking-wide uppercase">
            {badge}
          </span>
        ) : card.discountPercent ? (
          <span className="bg-error absolute top-2 start-2 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{card.discountPercent}%
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Category first, then the condition pill — the order in the design. */}
        <div className="flex items-center gap-2">
          {card.category?.name && (
            <span className="text-caption text-ink-tertiary truncate">
              {card.category.name}
            </span>
          )}
          {conditionKey && (
            <span
              className={`shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold ${tone}`}
            >
              {t(`conditions.${conditionKey}`)}
            </span>
          )}
        </div>

        {/*
          dir="auto" because listing titles are seller-authored free text — an
          Arabic title must render right-to-left even inside the English site,
          and vice versa.
        */}
        <Link
          href={`/products/${card.id}`}
          dir="auto"
          className="text-label line-clamp-2 hover:underline"
        >
          {card.title}
        </Link>

        {card.seller?.handle && (
          <span className="text-caption text-ink-tertiary truncate" dir="ltr">
            @{card.seller.handle}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col">
            {/*
              Auction listings carry no `price` — their value lives in
              `auction.currentBid`, falling back to the starting bid before any
              bids are placed. Without this an auction card renders blank.
            */}
            {isAuction ? (
              <>
                <span className="text-caption text-ink-tertiary">
                  {t("currentBid")}
                </span>
                <span className="text-h3">
                  {formatPrice(cardAmount(card), card.currency ?? "SAR")}
                </span>
              </>
            ) : (
              <>
                {card.originalPrice && card.discountPercent ? (
                  <span className="text-caption text-ink-tertiary line-through">
                    {formatPrice(card.originalPrice, card.currency ?? "SAR")}
                  </span>
                ) : null}
                <span className="text-h3">
                  {formatPrice(card.price, card.currency ?? "SAR")}
                </span>
              </>
            )}
          </div>

          {/*
            Liking requires a session and a mutation, so the interactive control
            lands with the wishlist work. Rendered as a link to the product
            rather than a dead button.
          */}
          <Link
            href={`/products/${card.id}`}
            aria-label={tCommon("seeAll")}
            className="text-ink-tertiary hover:text-error shrink-0"
          >
            <Heart className="size-5" aria-hidden />
          </Link>
        </div>

        {/*
          The design puts the primary actions on the card itself. Server Actions
          in plain forms, so they work without JavaScript; signed-out visitors are
          routed to sign-in rather than shown a failure.
        */}
        <div className="mt-3 flex gap-2">
          {isAuction ? (
            <Link
              href={`/auctions/${card.id}/terms`}
              className="bg-gold text-caption flex h-9 flex-1 items-center justify-center rounded-[18px] font-bold text-black"
            >
              {t("bidNow")}
            </Link>
          ) : (
            <>
              <form action={addToBagAction} className="flex-1">
                <input type="hidden" name="listingId" value={card.id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="border-action text-action text-caption flex h-9 w-full items-center justify-center rounded-[18px] border font-semibold"
                >
                  {t("addToCart")}
                </button>
              </form>
              <form action={buyNowAction} className="flex-1">
                <input type="hidden" name="listingId" value={card.id} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="bg-aqua text-caption flex h-9 w-full items-center justify-center rounded-[18px] font-bold text-black"
                >
                  {t("buyNow")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

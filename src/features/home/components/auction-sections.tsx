import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AuctionCountdown } from "@/features/auctions/components/auction-countdown";
import { cardAmount, type ProductCard as Card } from "@/lib/api/schemas/cards";

/**
 * The homepage's two auction sections — Figma `651:642` (Web_AuctionsTeaser)
 * and `651:1343` (Section_EndingSoon).
 *
 * They are **different designs**, not one component with a flag: the teaser is
 * a 173px strip of horizontal mini-cards on ink-900, the Ending Soon section is
 * a 575px band of vertical cards on near-black with badges, timer pills and a
 * full-width Place Bid. Both were previously rendering the standard light
 * `ProductCard` grid, which matched neither.
 *
 * Both bands are dark in either theme, so their surfaces are literal values
 * from the frames rather than tokens — the same call the story viewer makes.
 */

/* --------------------------------------------- teaser — 651:642 */

export async function AuctionsTeaser({ cards }: { cards: Card[] }) {
  const t = await getTranslations("Home");
  if (cards.length === 0) return null;

  return (
    <section className="bg-ink-900">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 lg:px-20">
        {/* Hdr — 651:643 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base text-[18px] font-bold">{t("liveAuctions")}</h2>
            <span className="bg-error text-base flex h-[22px] items-center rounded-[11px] px-2 text-[9px] font-bold">
              {t("live")}
            </span>
          </div>
          <Link
            href="/auctions"
            className="text-aqua flex shrink-0 items-center gap-1 text-[13px] font-medium"
          >
            {t("viewAllAuctions")}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>

        {/* Row — 651:649 */}
        <div className="grid gap-4 lg:grid-cols-3">
          {cards.slice(0, 3).map((card) => {
            const photo = resolveMediaUrl(card.coverPhotoUrl);
            const amount = cardAmount(card);
            return (
              <article
                key={card.id}
                className="bg-ink-800 border-ink-700 flex min-w-0 items-center gap-3 rounded-12 border p-3"
              >
                <Link
                  href={`/products/${card.id}`}
                  className="bg-ink-700 size-14 shrink-0 overflow-hidden rounded-8"
                >
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={photo}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                </Link>

                {/* Info — 651:653 */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-base truncate text-[13px] font-bold" dir="auto">
                    {card.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-aqua text-[14px] font-bold" dir="ltr">
                      {formatPrice(amount, card.currency ?? "SAR")}
                    </span>
                    <span className="text-ink-500 text-[11px]">
                      {t("bids", { count: card.auction?.bidCount ?? 0 })}
                    </span>
                  </div>
                  {card.auction?.endsAt && (
                    <span className="text-error flex h-[22px] w-fit items-center rounded-[11px] bg-error-tint px-2 text-[11px] font-bold">
                      <AuctionCountdown
                        endsAt={card.auction.endsAt}
                        endedLabel={t("ended")}
                        variant="hm"
                      />
                    </span>
                  )}
                </div>

                <Link
                  href={`/products/${card.id}`}
                  className="bg-aqua flex h-9 w-24 shrink-0 items-center justify-center rounded-[18px] text-[12px] font-bold text-black"
                >
                  {t("bid")}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------- ending soon — 651:1343 */

export async function EndingSoonSection({ cards }: { cards: Card[] }) {
  const t = await getTranslations("Home");
  if (cards.length === 0) return null;

  return (
    <section className="bg-ink-900">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-12 lg:px-20">
        {/* R — 651:1344 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="bg-error text-base flex h-[26px] w-fit items-center gap-2 rounded-[13px] px-2.5 text-[10px] font-bold">
              <span className="bg-base size-2 rounded-[4px]" aria-hidden />
              {t("liveAuctionsBadge")}
            </span>
            <h2 className="text-base text-[22px] font-bold">{t("endingSoon")}</h2>
            <p className="text-ink-500 text-[13px]">{t("endingSoonSubtitle")}</p>
          </div>
          <Link
            href="/auctions"
            className="text-aqua flex shrink-0 items-center gap-1 text-[13px] font-medium"
          >
            {t("viewAllAuctions")}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>

        {/* R — 651:1352 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {cards.slice(0, 4).map((card) => {
            const photo = resolveMediaUrl(card.coverPhotoUrl);
            const amount = cardAmount(card);
            return (
              <article
                key={card.id}
                className="flex flex-col overflow-hidden rounded-16 border border-ink-700 bg-ink-800"
              >
                {/* ImgWrap — 651:1354 */}
                <Link
                  href={`/products/${card.id}`}
                  className="relative block h-[200px] bg-ink-700"
                >
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={photo}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="bg-error text-base absolute start-0 top-0 flex h-6 w-[72px] items-center justify-center rounded-ee-8 text-[9px] font-bold">
                    {t("auctionBadge")}
                  </span>
                  {card.auction?.endsAt && (
                    <span className="text-base absolute start-2.5 bottom-2.5 flex h-7 items-center gap-1.5 rounded-[14px] bg-black/70 px-2.5 text-[11px] font-bold">
                      <span className="bg-error size-1.5 rounded-[3px]" aria-hidden />
                      <AuctionCountdown
                        endsAt={card.auction.endsAt}
                        endedLabel={t("ended")}
                        variant="clock"
                      />
                    </span>
                  )}
                </Link>

                {/* C — 651:1361 */}
                <div className="flex flex-1 flex-col gap-2.5 px-3.5 pt-3.5 pb-4">
                  {card.category?.name && (
                    <p className="text-ink-500 truncate text-[11px]" dir="auto">
                      {card.category.name}
                    </p>
                  )}
                  <p className="text-base truncate text-[14px] font-semibold" dir="auto">
                    {card.title}
                  </p>

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-ink-500 text-[10px]">
                        {t("currentBid")}
                      </span>
                      <span className="text-aqua text-[18px] font-bold" dir="ltr">
                        {formatPrice(amount, card.currency ?? "SAR")}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5 text-[10px]">
                      <span className="text-ink-500">
                        {t("bids", { count: card.auction?.bidCount ?? 0 })}
                      </span>
                      <span className="text-aqua">{t("active")}</span>
                    </span>
                  </div>

                  <Link
                    href={`/products/${card.id}`}
                    className="bg-aqua mt-auto flex h-11 items-center justify-center rounded-[22px] text-[13px] font-bold text-black"
                  >
                    {t("placeBid")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMyBids } from "@/lib/api/endpoints/auctions";
import {
  amountOf,
  MY_BID_STATUSES,
  type MyBid,
  type MyBidStatus,
} from "@/lib/api/schemas/auction";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { AuctionCountdown } from "@/features/auctions/components/auction-countdown";

/**
 * My Bids — Figma `651:7282` (Web_MyBids), empty state `651:7411`.
 *
 * `GET /me/bids` exists after all; the route map's warning that bids could only
 * be read listing by listing is out of date. It returns one row per auction —
 * the viewer's highest bid, the current bid, whether they lead, and the
 * `counts` the three tabs need.
 *
 * Two deviations, recorded in plans/09 C33:
 *
 * - The design's fourth tab is "Watchlist". There is no auction watchlist in
 *   the API; the wishlist is the nearest real thing, so the tab links there
 *   rather than sitting dead.
 * - "18 bids placed" per row has no field on this endpoint, and asking each
 *   auction for its own count would be a request per card. Omitted.
 */
export const metadata: Metadata = { robots: { index: false } };

function isStatus(value: unknown): value is MyBidStatus {
  return MY_BID_STATUSES.includes(value as MyBidStatus);
}

export default async function MyBidsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("MyBids");
  const tAuctions = await getTranslations("Auctions");
  const query = await searchParams;
  const tab = isStatus(query.tab) ? query.tab : "active";

  // The unfiltered call carries `counts` for every tab and the rows the stat
  // cards are summed from; the filtered one is what the tab shows.
  const [all, current] = await Promise.all([getMyBids(), getMyBids(tab)]);

  const counts = all.counts ?? {};
  const totalBidValue = all.items.reduce(
    (sum, bid) => sum + amountOf(bid.userHighestBid),
    0,
  );
  const beingOutbid = all.items.filter(
    (bid) => bid.status === "active" && bid.isLeading !== true,
  ).length;
  const currency = all.items[0]?.currency ?? "SAR";

  const stats = [
    {
      key: "activeBids",
      value: String(counts.active ?? 0),
      tone: "bg-info-tint text-info",
    },
    {
      key: "auctionsWon",
      value: String(counts.won ?? 0),
      tone: "bg-action-tint text-action",
    },
    {
      key: "totalBidValue",
      value: formatPrice(totalBidValue, currency),
      tone: "bg-warn-tint text-amber-deep",
    },
    {
      key: "beingOutbid",
      value: String(beingOutbid),
      tone: "bg-error-tint text-error",
    },
  ] as const;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        {/* PH — 651:7283 */}
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="bids" />

          {/* Content — 651:7311 */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h2 className="text-[22px] font-bold">{t("title")}</h2>

            {/* Stats — 651:7313 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className={`flex flex-col gap-1 rounded-12 p-4 ${stat.tone}`}
                >
                  <span className="text-[22px] font-bold" dir="ltr">
                    {stat.value}
                  </span>
                  <span className="text-[11px]">{t(`stats.${stat.key}`)}</span>
                </div>
              ))}
            </div>

            {/* Tabs — 651:7326 */}
            <div className="bg-base border-line flex h-12 items-center overflow-x-auto rounded-10 border ps-2">
              {MY_BID_STATUSES.map((status) => (
                <Link
                  key={status}
                  href={status === "active" ? "/account/bids" : `/account/bids?tab=${status}`}
                  className={`flex h-12 shrink-0 items-center px-4 text-[13px] ${
                    tab === status
                      ? "text-ink-900 font-semibold"
                      : "text-ink-500"
                  }`}
                >
                  {t(`tabs.${status}`, { count: counts[status] ?? 0 })}
                </Link>
              ))}
              <Link
                href="/account/wishlist"
                className="text-ink-500 flex h-12 shrink-0 items-center px-4 text-[13px]"
              >
                {t("tabs.watchlist")}
              </Link>
            </div>

            {current.items.length === 0 ? (
              /* Web_Empty_Bids — 651:7411 */
              <div className="bg-base border-line rounded-16 border border-dashed p-14 text-center">
                <p className="text-body-lg mb-2">{t("emptyTitle")}</p>
                <p className="text-body text-ink-secondary mb-6">
                  {t("emptyBody")}
                </p>
                <Link
                  href="/auctions"
                  className="bg-aqua text-on-accent inline-flex h-11 items-center rounded-[22px] px-6 text-[13px] font-bold"
                >
                  {t("emptyCta")}
                </Link>
              </div>
            ) : (
              current.items.map((bid) => (
                <BidCard
                  key={bid.listingId}
                  bid={bid}
                  labels={{
                    yourBid: t("yourBid"),
                    currentBid: t("currentBid"),
                    leading: t("leading"),
                    outbid: t("outbid"),
                    view: t("viewAuction"),
                    again: t("bidAgain"),
                    ended: tAuctions("ended"),
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** BidCard — 651:7335. Outbid rows get the red border and the Bid Again CTA. */
function BidCard({
  bid,
  labels,
}: {
  bid: MyBid;
  labels: Record<
    "yourBid" | "currentBid" | "leading" | "outbid" | "view" | "again" | "ended",
    string
  >;
}) {
  const photo = resolveMediaUrl(bid.coverPhotoUrl);
  const currency = bid.currency ?? "SAR";
  const leading = bid.isLeading === true;
  const live = bid.status === "active";
  const outbid = live && !leading;

  return (
    <article
      className={`bg-base flex items-center gap-4 rounded-[14px] p-4 ${
        outbid ? "border-error border-[1.5px]" : "border-line border"
      }`}
    >
      <Link
        href={`/products/${bid.listingId}`}
        className="bg-fill-100 block size-16 shrink-0 overflow-hidden rounded-10"
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img src={photo} alt="" className="size-full object-cover" />
        )}
      </Link>

      {/* Info — 651:7337 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/products/${bid.listingId}`}
          className="truncate text-[14px] font-semibold"
          dir="auto"
        >
          {bid.title}
        </Link>
        <div className="flex gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-ink-tertiary text-[10px]">
              {labels.yourBid}
            </span>
            <span className="text-[14px] font-bold" dir="ltr">
              {formatPrice(amountOf(bid.userHighestBid), currency)}
            </span>
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-ink-tertiary text-[10px]">
              {labels.currentBid}
            </span>
            <span
              className={`text-[14px] font-bold ${outbid ? "text-error" : "text-action"}`}
              dir="ltr"
            >
              {formatPrice(amountOf(bid.currentBid), currency)}
            </span>
          </span>
        </div>
      </div>

      {/* Right — 651:7347 */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {live && (
          <span
            className={`flex h-[26px] items-center rounded-[13px] px-2.5 text-[11px] font-bold ${
              leading ? "bg-action-tint text-action" : "bg-error-tint text-error"
            }`}
          >
            {leading ? labels.leading : labels.outbid}
          </span>
        )}
        {live && bid.auctionEndsAt && (
          <span className="bg-error-tint text-error flex h-[26px] items-center rounded-[13px] px-2.5 text-[11px] font-bold">
            <AuctionCountdown
              endsAt={bid.auctionEndsAt}
              endedLabel={labels.ended}
              variant="hm"
            />
          </span>
        )}
        <Link
          href={`/products/${bid.listingId}`}
          className={`flex h-[34px] items-center rounded-[17px] px-3.5 text-[11px] font-bold text-white ${
            outbid ? "bg-error" : "bg-ink-900"
          }`}
        >
          {outbid ? labels.again : labels.view}
        </Link>
      </div>
    </article>
  );
}

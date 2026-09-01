import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getFormatter } from "next-intl/server";
import { Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTradeRequests } from "@/lib/api/endpoints/trade";
import { requireUser } from "@/lib/auth/current-user";
import {
  HISTORY_STATUSES,
  isTradeTab,
  TRADE_TABS,
  type TradeRequest,
  type TradeStatus,
  type TradeTab,
} from "@/lib/api/schemas/trade";
import { coverPhotoUrl, type Listing } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { SwapHorizontal } from "@/components/icons/trade-icons";
import {
  declineTradeAction,
  acceptTradeAction,
} from "@/features/trade/actions";
import {
  canCounter,
  canDecide,
  TRADE_BADGE_TONE,
  tradeCash,
  tradeSides,
} from "@/features/trade/helpers";

/**
 * Trade History — Figma `651:6567` (Web_TradeHistory).
 *
 * The design puts this inside the account shell, alongside My Orders and My
 * Bids, so it lives at `/account/trades` rather than the `/trade/requests` the
 * route map guessed. The sidebar's `trades` entry pointed at that dead route
 * until this shipped.
 *
 * The History tab has no `role` of its own — it is every settled state on both
 * sides, so it is partitioned out of the two role calls rather than fetched.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function TradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, "/account/trades");

  const t = await getTranslations("Trade");
  const format = await getFormatter();
  const query = await searchParams;
  const tab =
    typeof query.tab === "string" && isTradeTab(query.tab)
      ? query.tab
      : "received";
  const sent = query.sent === "1";

  const buckets = await loadTrades();

  const counts = {
    received: buckets.received.length,
    sent: buckets.sent.length,
    history: buckets.history.length,
  };
  const rows = buckets[tab];

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        {/* TR — 651:6568 */}
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="trades" />

          {/* Content — 651:6596 */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Hdr — 651:6597 */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-ink-900 text-[22px] font-bold">
                {t("historyTitle")}
              </h2>
              <Link
                href="/trade"
                className="border-aqua text-action flex h-10 shrink-0 items-center justify-center rounded-20 border-[1.5px] px-[18px] text-[13px] font-bold"
              >
                {t("browseToTrade")}
              </Link>
            </div>

            {sent && (
              <p className="bg-action-tint text-action rounded-10 p-3 text-[13px] font-medium">
                {t("offerSentBanner")}
              </p>
            )}

            {/* Tabs — 651:6601 */}
            <div className="bg-base border-line-200 flex items-center overflow-x-auto rounded-10 border ps-2">
              {TRADE_TABS.map((key) => {
                const active = tab === key;
                return (
                  <Link
                    key={key}
                    href={
                      key === "received"
                        ? "/account/trades"
                        : `/account/trades?tab=${key}`
                    }
                    aria-current={active ? "page" : undefined}
                    className="flex h-12 shrink-0 items-center gap-2 px-4"
                  >
                    <span
                      className={`text-[13px] ${
                        active
                          ? "text-ink-900 font-semibold"
                          : "text-ink-500"
                      }`}
                    >
                      {t(`tabs.${key}`)}
                    </span>
                    <span
                      className={`flex h-5 items-center justify-center rounded-10 px-[7px] text-[10px] font-bold ${
                        active
                          ? "bg-action-tint text-action"
                          : "bg-fill-100 text-ink-400"
                      }`}
                    >
                      {counts[key] ?? 0}
                    </span>
                  </Link>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <div className="bg-base border-line-200 rounded-[14px] border border-dashed p-14 text-center">
                <p className="text-ink-900 mb-2 text-[15px] font-semibold">
                  {t(`empty.${tab}.title`)}
                </p>
                <p className="text-ink-500 mb-6 text-[13px]">
                  {t(`empty.${tab}.body`)}
                </p>
                <Link
                  href="/trade"
                  className="border-aqua text-action inline-flex h-10 items-center rounded-20 border-[1.5px] px-[18px] text-[13px] font-bold"
                >
                  {t("browseToTrade")}
                </Link>
              </div>
            ) : (
              rows.map((request) => {
                const sides = tradeSides(request, user.id);
                const cash = tradeCash(request, user.id);
                const mine = sides.mine[0] ?? null;
                const theirs = sides.theirs[0] ?? null;
                const currency = request.currency ?? "SAR";
                const handle = theirs?.seller?.handle
                  ? `@${theirs.seller.handle}`
                  : null;

                return (
                  /* Card — 651:6614 */
                  <article
                    key={request.id}
                    className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border"
                  >
                    {/* CH — 651:6615 */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="bg-fill-100 text-ink-700 flex size-8 shrink-0 items-center justify-center rounded-16 text-[10px] font-bold">
                          {(handle ?? "?")
                            .replace("@", "")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <span
                          className="text-ink-900 truncate text-[13px] font-semibold"
                          dir="auto"
                        >
                          {handle ?? request.tradeNumber ?? t("tradeRef")}
                        </span>
                        {request.createdAt && (
                          <>
                            <span className="text-ink-400 shrink-0 text-[10px]">
                              ·
                            </span>
                            <span className="text-ink-400 shrink-0 text-[11px]">
                              {format.relativeTime(new Date(request.createdAt))}
                            </span>
                          </>
                        )}
                      </div>
                      <span
                        className={`flex h-6.5 shrink-0 items-center justify-center rounded-[13px] px-2.5 text-[11px] font-bold ${
                          TRADE_BADGE_TONE[request.status] ??
                          "bg-fill-100 text-ink-500"
                        }`}
                      >
                        {t(`status.${request.status}`)}
                      </span>
                    </div>

                    <span className="bg-fill-100 h-px w-full" aria-hidden />

                    {/* ItemsRow — 651:6625 */}
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <ItemThumb
                        listing={theirs}
                        caption={t("theyOffer")}
                        fallback={t("itemUnavailable")}
                      />

                      {/* Arrows — 651:6631 */}
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <span className="bg-fill-100 text-ink-500 flex size-11 items-center justify-center rounded-[22px]">
                          <SwapHorizontal className="size-6" />
                        </span>
                        <span className="text-action text-[10px] font-bold whitespace-nowrap">
                          {cash.isEven
                            ? t("evenTrade")
                            : cash.difference > 0
                              ? t("youReceive", {
                                  amount: formatPrice(
                                    Math.abs(cash.difference),
                                    currency,
                                  ),
                                })
                              : t("theyWant", {
                                  amount: formatPrice(
                                    Math.abs(cash.difference),
                                    currency,
                                  ),
                                })}
                        </span>
                      </div>

                      <ItemThumb
                        listing={mine}
                        caption={t("yourItem")}
                        fallback={t("itemUnavailable")}
                      />
                    </div>

                    <span className="bg-fill-100 h-px w-full" aria-hidden />

                    {/* ActRow — 651:6642 */}
                    <div className="flex flex-wrap items-start gap-2.5 px-4 py-3">
                      {canDecide(request.status, sides.isRequester) ? (
                        <>
                          <form action={acceptTradeAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={request.id} />
                            <button
                              type="submit"
                              className="bg-aqua flex h-9 items-center justify-center rounded-8 px-4 text-[12px] font-bold text-black"
                            >
                              {t("accept")}
                            </button>
                          </form>
                          {canCounter(request.status, sides.isRequester) && (
                            <Link
                              href={`/account/trades/${request.id}/counter`}
                              className="bg-base border-line-200 text-ink-700 flex h-9 items-center justify-center rounded-8 border px-4 text-[12px] font-bold"
                            >
                              {t("counter")}
                            </Link>
                          )}
                          <form action={declineTradeAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={request.id} />
                            <button
                              type="submit"
                              className="bg-error-tint text-error flex h-9 items-center justify-center rounded-8 px-4 text-[12px] font-bold"
                            >
                              {t("decline")}
                            </button>
                          </form>
                        </>
                      ) : (
                        <Link
                          href={`/account/trades/${request.id}`}
                          className="bg-ink-900 text-base flex h-9 items-center justify-center rounded-8 px-4 text-[12px] font-bold"
                        >
                          {request.status === "accepted"
                            ? t("trackShipment")
                            : t("viewTrade")}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** TheyOffer / MyOffer — 651:6626. */
function ItemThumb({
  listing,
  caption,
  fallback,
}: {
  listing: Listing | null;
  caption: string;
  fallback: string;
}) {
  const photo = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;

  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <span className="text-ink-400 text-[10px]">{caption}</span>
      <div className="flex flex-col items-center gap-1">
        <span className="bg-fill-100 flex size-15 items-center justify-center overflow-hidden rounded-8">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img src={photo} alt="" className="size-full object-cover" />
          ) : (
            <Package className="text-ink-400 size-5" aria-hidden />
          )}
        </span>
        <span
          className="text-ink-500 max-w-[88px] truncate text-[9px]"
          dir="auto"
        >
          {listing?.title ?? fallback}
        </span>
      </div>
    </div>
  );
}

/**
 * Every trade the viewer is part of, split into the three tabs.
 *
 * `GET /trade-requests/counts` is not used here: it counts only what still
 * needs an answer, so an accepted trade sits in Received under a badge of 0 —
 * while the frame's badge is the number of rows in the tab. Two role calls give
 * both the rows and the counts, and History falls out of them rather than
 * costing one request per settled status.
 */
async function loadTrades(): Promise<Record<TradeTab, TradeRequest[]>> {
  const [received, sent] = await Promise.all([
    getTradeRequests({ role: "received", limit: 50 }).catch(() => ({ items: [] })),
    getTradeRequests({ role: "sent", limit: 50 }).catch(() => ({ items: [] })),
  ]);

  const settled = (row: TradeRequest) =>
    HISTORY_STATUSES.includes(row.status as TradeStatus);

  return {
    received: received.items.filter((row) => !settled(row)),
    sent: sent.items.filter((row) => !settled(row)),
    history: [...received.items, ...sent.items]
      .filter(settled)
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
  };
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getFormatter } from "next-intl/server";
import { notFound } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getTradeListingIndex,
  getTradeRequest,
} from "@/lib/api/endpoints/trade";
import { requireUser } from "@/lib/auth/current-user";
import type { Listing } from "@/lib/api/schemas/listing";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import {
  acceptTradeAction,
  cancelTradeAction,
  confirmReceiptAction,
  declineTradeAction,
  shipTradeAction,
} from "@/features/trade/actions";
import { CashBreakdown } from "@/features/trade/components/cash-breakdown";
import { TradeTimeline } from "@/features/trade/components/trade-timeline";
import {
  TradeCompareCard,
  TradeSideCard,
} from "@/features/trade/components/trade-item";
import {
  isDecidable,
  pickListings,
  TRADE_BADGE_TONE,
  tradeCash,
  tradeSides,
  tradeTimeline,
} from "@/features/trade/helpers";

/**
 * Trade detail — Figma `651:6446` (Web_TradeStatus_Detail) and `651:6319`
 * (Web_Trade_OfferReceived).
 *
 * Two frames, one route: an offer still open to the person who has to answer it
 * gets the comparison-and-decide layout; everything else gets the timeline.
 * Both sit inside the account shell, which is where `651:6447`'s own breadcrumb
 * ("Trade History > Trade #…") points back to.
 *
 * Deviations, recorded in plans/09:
 *
 * - The received-offer frame prints the requester's note and a "Verified swapper
 *   · 4.9 rating · 38 trades" line. There is no note (GAP-84), and the payload
 *   names the counterparty by id only — no rating, no trade count (GAP-83). The
 *   panel renders what the listing's `seller` carries and drops the rest.
 * - "Est. Delivery" has no field behind it and is omitted; the ship-by deadline,
 *   which is real, takes its row. "Hub Location" is translated copy.
 */
export const metadata: Metadata = { robots: { index: false } };

const TIMELINE_KEYS = [
  "offered",
  "accepted",
  "shipping",
  "inHub",
  "inspected",
  "completed",
] as const;

const FLAGS = [
  "accepted",
  "countered",
  "declined",
  "cancelled",
  "shipped",
  "confirmed",
  "sent",
] as const;

export default async function TradeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/account/trades/${id}`);

  const t = await getTranslations("Trade");
  const tListing = await getTranslations("Listing");
  const format = await getFormatter();
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const flag = FLAGS.find((key) => query[key] === "1") ?? null;

  const request = await getTradeRequest(id);
  if (!request) notFound();

  const index = await getTradeListingIndex().catch(
    () => new Map<string, Listing>(),
  );
  /*
    The detail endpoint joins the target listing, but that copy carries no
    `seller` and no `photos` — so it is only a fallback for an id the trade
    catalogue no longer lists, never a replacement for the richer row.
  */
  if (request.listing && !index.has(request.listing.id)) {
    index.set(request.listing.id, request.listing);
  }

  const sides = tradeSides(request, user.id);
  const cash = tradeCash(request, sides, user.id);
  const mine = pickListings(sides.myListingIds, index)[0] ?? null;
  const theirs = pickListings(sides.theirListingIds, index)[0] ?? null;
  const currency = request.currency ?? "SAR";

  const decide =
    isDecidable(request.status) &&
    (sides.isRequester ? request.status === "countered" : true);
  const canCounter = isDecidable(request.status) && !sides.isRequester;
  const canCancel = request.status === "pending" && sides.isRequester;

  const myLeg = (request.shipments ?? []).find((s) =>
    sides.isRequester
      ? s.leg === "requester_to_hub"
      : s.leg === "responder_to_hub",
  );
  const canShip = request.status === "accepted" && !myLeg?.shippedAt;
  const canConfirm =
    request.status === "accepted" && Boolean(request.inspectedAt);

  const steps = tradeTimeline(request, request.shipments ?? []);
  const counterparty = theirs?.seller ?? null;
  const handle = counterparty?.handle ? `@${counterparty.handle}` : null;

  const condition = (listing: Listing | null) =>
    listing?.condition ? tListing(`conditions.${listing.condition}`) : null;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        <h1 className="pb-6 text-[28px] font-bold">{t("accountTitle")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="trades" />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Row — 651:6447 */}
            <nav className="text-ink-500 flex items-center gap-2 text-[12px]">
              <Link href="/account/trades" className="hover:text-ink-900">
                {t("historyTitle")}
              </Link>
              <ChevronRight className="size-3 rtl:rotate-180" aria-hidden />
              <span className="text-ink-900" dir="auto">
                {request.tradeNumber ?? t("tradeRef")}
              </span>
            </nav>

            {flag && (
              <p className="bg-action-tint text-action rounded-10 p-3 text-[13px] font-medium">
                {t(`flags.${flag}`)}
              </p>
            )}
            {error && (
              <p className="bg-error-tint text-error rounded-10 p-3 text-[13px] font-medium">
                {t(`errors.${error}`)}
              </p>
            )}

            {/* HeaderCard — 651:6451 */}
            <div className="bg-base border-line-200 flex items-center gap-4 rounded-16 border px-6 py-5">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <span className="text-ink-900 text-[20px] font-bold" dir="auto">
                  {request.tradeNumber ?? t("tradeRef")}
                </span>
                <span className="text-ink-500 text-[13px]" dir="auto">
                  {[
                    handle,
                    request.createdAt
                      ? t("startedOn", {
                          date: format.dateTime(new Date(request.createdAt), {
                            dateStyle: "medium",
                          }),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </span>
                <span
                  className={`flex h-6 items-center justify-center rounded-12 px-2.5 text-[11px] font-bold ${
                    TRADE_BADGE_TONE[request.status] ??
                    "bg-fill-100 text-ink-500"
                  }`}
                >
                  {t(`status.${request.status}`)}
                </span>
              </div>
            </div>

            {decide ? (
              <>
                {/* comparison — 651:6338 */}
                <div className="bg-base border-line rounded-16 border p-10">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-tertiary text-[10px] font-bold tracking-wide">
                      {t("theyreOffering")}
                    </span>
                    <span className="text-ink-tertiary text-[10px] font-bold tracking-wide">
                      {t("forYourItem")}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col items-stretch gap-5 lg:flex-row lg:items-center">
                    <TradeCompareCard
                      listing={theirs}
                      fallbackTitle={t("itemUnavailable")}
                      valueLabel={t("estValue")}
                      value={sides.theirValue}
                      currency={currency}
                      conditionLabel={condition(theirs)}
                    />
                    <span
                      className="text-azure mx-auto shrink-0 text-[30px] font-bold"
                      aria-hidden
                    >
                      ⇄
                    </span>
                    <TradeCompareCard
                      listing={mine}
                      fallbackTitle={t("itemUnavailable")}
                      valueLabel={t("estValue")}
                      value={sides.myValue}
                      currency={currency}
                      conditionLabel={condition(mine)}
                    />
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <CashBreakdown
                    cash={cash}
                    theirValue={sides.theirValue}
                    myValue={sides.myValue}
                    currency={currency}
                    labels={breakdownLabels(t)}
                  />

                  {/* message — 651:6371 */}
                  <div className="bg-surface border-line-subtle flex flex-col rounded-16 border p-6">
                    <div className="flex items-center gap-3">
                      <span className="bg-tint text-ink-secondary flex size-10 items-center justify-center rounded-full text-[13px] font-bold">
                        {(handle ?? "?")
                          .replace("@", "")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="flex flex-col">
                        <span
                          className="text-ink text-[14px] font-semibold"
                          dir="auto"
                        >
                          {handle ?? t("theSeller")}
                        </span>
                        {counterparty?.isTopSeller && (
                          <span className="text-ink-tertiary text-[12px]">
                            {t("topSeller")}
                          </span>
                        )}
                      </div>
                    </div>

                    {request.counterNote ? (
                      <p
                        className="text-ink-secondary mt-6 text-[15px]"
                        dir="auto"
                      >
                        “{request.counterNote}”
                      </p>
                    ) : (
                      <p className="text-ink-tertiary mt-6 text-[15px]">
                        {t("noNote")}
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-1 pt-6">
                      {counterparty?.isVerified && (
                        <span className="text-azure text-[12px] font-medium">
                          {t("verifiedSwapper")}
                        </span>
                      )}
                      {request.expiresAt && (
                        <span className="text-ink-tertiary text-[12px]">
                          {t("expiresOn", {
                            date: format.dateTime(new Date(request.expiresAt), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }),
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions — 651:6378 */}
                <div className="flex flex-col gap-4 sm:flex-row">
                  <form action={acceptTradeAction} className="flex-1">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={request.id} />
                    <button
                      type="submit"
                      className="bg-aqua text-on-accent h-13 w-full rounded-12 text-[15px] font-semibold"
                    >
                      {t("acceptTrade")}
                    </button>
                  </form>

                  {canCounter && (
                    <Link
                      href={`/account/trades/${request.id}/counter`}
                      className="bg-base border-line text-ink flex h-13 flex-1 items-center justify-center rounded-12 border text-[15px] font-semibold"
                    >
                      {t("counterOffer")}
                    </Link>
                  )}

                  <form action={declineTradeAction} className="flex-1">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={request.id} />
                    <button
                      type="submit"
                      className="bg-error-tint2 text-error h-13 w-full rounded-12 text-[15px] font-semibold"
                    >
                      {t("decline")}
                    </button>
                  </form>
                </div>

                <p className="text-ink-tertiary text-[12px]">
                  {t("escrowNotice")}
                </p>
              </>
            ) : (
              /* Row — 651:6459 */
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                  {/* TimelineCard — 651:6461 */}
                  <div className="bg-base border-line-200 flex flex-col items-start rounded-[14px] border p-5">
                    <h2 className="text-ink-900 text-[16px] font-semibold">
                      {t("timelineTitle")}
                    </h2>
                    <span className="bg-line-200 mt-5 h-px w-full" aria-hidden />
                    <TradeTimeline
                      steps={steps}
                      formatAt={(iso) =>
                        format.dateTime(new Date(iso), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      }
                      labels={Object.fromEntries(
                        TIMELINE_KEYS.map((key) => [
                          key,
                          {
                            title: t(`timeline.${key}.title`),
                            body: t(`timeline.${key}.body`),
                          },
                        ]),
                      )}
                    />
                  </div>

                  {/* ItemsCard — 651:6515 */}
                  <div className="bg-base border-line-200 flex flex-col items-start gap-3.5 rounded-[14px] border p-5">
                    <h2 className="text-ink-900 text-[15px] font-semibold">
                      {t("itemsTitle")}
                    </h2>
                    <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-start">
                      <TradeSideCard
                        listing={mine}
                        caption={t("yourItemCap")}
                        fallbackTitle={t("itemUnavailable")}
                        by={t("you")}
                        currency={currency}
                        tone="bg-action-tint"
                      />
                      <TradeSideCard
                        listing={theirs}
                        caption={t("theirItemCap")}
                        fallbackTitle={t("itemUnavailable")}
                        by={handle ?? t("theSeller")}
                        currency={currency}
                        tone="bg-info-tint2"
                      />
                    </div>
                  </div>
                </div>

                {/* Col — 651:6532 */}
                <div className="flex w-full flex-col items-start gap-4 lg:w-[488px]">
                  {/* InfoCard — 651:6533 */}
                  <div className="bg-base border-line-200 flex w-full flex-col items-start gap-3 rounded-[14px] border p-4">
                    <h2 className="text-ink-900 text-[14px] font-semibold">
                      {t("detailsTitle")}
                    </h2>
                    <span className="bg-line-200 h-px w-full" aria-hidden />
                    <dl className="flex w-full flex-col">
                      <InfoRow
                        label={t("tradeId")}
                        value={request.tradeNumber ?? "—"}
                      />
                      {request.createdAt && (
                        <InfoRow
                          label={t("started")}
                          value={format.dateTime(new Date(request.createdAt), {
                            dateStyle: "medium",
                          })}
                        />
                      )}
                      <InfoRow label={t("hubLocation")} value={t("hubValue")} />
                      {request.shipByDeadline && (
                        <InfoRow
                          label={t("shipBy")}
                          value={format.dateTime(
                            new Date(request.shipByDeadline),
                            { dateStyle: "medium" },
                          )}
                        />
                      )}
                      <InfoRow
                        label={t("authentication")}
                        value={
                          request.inspectedAt
                            ? t("authDone")
                            : request.hubReceivedAt
                              ? t("authInProgress")
                              : t("authPending")
                        }
                      />
                    </dl>
                  </div>

                  {/* ProtNote — 651:6551 */}
                  <div className="bg-action-tint border-action flex w-full flex-col items-start gap-2 rounded-12 border p-3.5">
                    <h2 className="text-action text-[13px] font-semibold">
                      {t("hubTitle")}
                    </h2>
                    {(["authentic", "condition", "bothPass"] as const).map(
                      (key) => (
                        <div key={key} className="flex w-full items-center gap-2">
                          <span className="bg-action text-base flex size-4 shrink-0 items-center justify-center rounded-8">
                            <Check className="size-2.5" strokeWidth={3.5} />
                          </span>
                          <span className="text-ink-500 text-[11px]">
                            {t(`hubChecks.${key}`)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  {canShip && (
                    <form
                      action={shipTradeAction}
                      className="bg-base border-line-200 flex w-full flex-col gap-3 rounded-[14px] border p-4"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={request.id} />
                      <h2 className="text-ink-900 text-[14px] font-semibold">
                        {t("shipTitle")}
                      </h2>
                      <p className="text-ink-500 text-[12px]">{t("shipBody")}</p>
                      <input
                        name="carrier"
                        placeholder={t("carrier")}
                        aria-label={t("carrier")}
                        maxLength={60}
                        className="border-line-200 text-ink-900 placeholder:text-ink-400 h-11 rounded-12 border px-3 text-[13px]"
                      />
                      <input
                        name="trackingNumber"
                        placeholder={t("trackingNumber")}
                        aria-label={t("trackingNumber")}
                        maxLength={80}
                        dir="ltr"
                        className="border-line-200 text-ink-900 placeholder:text-ink-400 h-11 rounded-12 border px-3 text-[13px]"
                      />
                      <button
                        type="submit"
                        className="bg-aqua text-on-accent h-11 rounded-[22px] text-[13px] font-bold"
                      >
                        {t("markShipped")}
                      </button>
                    </form>
                  )}

                  {canConfirm && (
                    <form action={confirmReceiptAction} className="w-full">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={request.id} />
                      <button
                        type="submit"
                        className="bg-aqua text-on-accent h-11 w-full rounded-[22px] text-[13px] font-bold"
                      >
                        {t("confirmReceipt")}
                      </button>
                    </form>
                  )}

                  {canCancel && (
                    /* CancelBtn — 651:6565 */
                    <form action={cancelTradeAction} className="w-full">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={request.id} />
                      <button
                        type="submit"
                        className="border-error text-error h-11 w-full rounded-[22px] border text-[13px] font-medium"
                      >
                        {t("cancelTrade")}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Row — 651:6536. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <dt className="text-ink-500 text-[12px]">{label}</dt>
      <dd className="text-ink-900 text-end text-[12px] font-semibold" dir="auto">
        {value}
      </dd>
    </div>
  );
}

export function breakdownLabels(t: (key: string) => string) {
  return {
    title: t("cashTitle"),
    theirValue: t("theirItemValue"),
    myValue: t("yourItemValue"),
    even: t("evenTrade"),
    theyPay: t("cashTheyPay"),
    youPay: t("cashYouPay"),
    difference: t("cashDifference"),
    fee: t("platformFee"),
    shipping: t("shippingShare"),
    receive: t("youllReceive"),
    pay: t("youllPay"),
    directionUnknown: t("directionUnknown"),
  };
}

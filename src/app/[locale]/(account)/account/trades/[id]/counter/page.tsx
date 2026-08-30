import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getTradeListingIndex,
  getTradeRequest,
} from "@/lib/api/endpoints/trade";
import { requireUser } from "@/lib/auth/current-user";
import type { Listing } from "@/lib/api/schemas/listing";
import { COUNTER_NOTE_MAX } from "@/lib/api/schemas/trade";
import { formatPrice } from "@/lib/format/money";
import { counterTradeAction } from "@/features/trade/actions";
import { CashBreakdown } from "@/features/trade/components/cash-breakdown";
import { CounterAmount } from "@/features/trade/components/counter-amount";
import { TradeThumb } from "@/features/trade/components/trade-item";
import {
  isDecidable,
  pickListings,
  toNumber,
  tradeCash,
  tradeSides,
} from "@/features/trade/helpers";
import { breakdownLabels } from "../page";

/**
 * Make a counter offer — Figma `651:6385` (Web_Trade_CounterOffer).
 *
 * A full page rather than part of the detail view, as the frame draws it, and
 * reachable only by the target listing's owner — the API allows nobody else to
 * counter. Unlike the offer note (GAP-84), this one is real: `note` is on the
 * counter DTO and is sent.
 *
 * The frame's signed input ("Negative = you pay them") is one-directional here,
 * because `amount` is `minimum: 0` and a counter is always the responder asking
 * to be paid — see the CounterAmount component and GAP-85.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function CounterOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/account/trades/${id}/counter`);

  const t = await getTranslations("Trade");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const request = await getTradeRequest(id);
  if (!request) notFound();

  const sides = tradeSides(request, user.id);
  // Only the target listing's owner can counter, and only while it is open.
  if (sides.isRequester || !isDecidable(request.status)) {
    redirect(`/${locale}/account/trades/${id}`);
  }

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

  const cash = tradeCash(request, sides, user.id);
  const mine = pickListings(sides.myListingIds, index)[0] ?? null;
  const theirs = pickListings(sides.theirListingIds, index)[0] ?? null;
  const currency = request.currency ?? "SAR";
  const handle = theirs?.seller?.handle ? `@${theirs.seller.handle}` : null;

  const startingAmount = Math.abs(
    toNumber(request.counterAmount ?? request.autoDifference),
  );

  return (
    <div className="bg-surface min-h-screen pb-14">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-12 lg:px-20">
        <h1 className="text-ink text-[32px] font-bold">{t("counterTitle")}</h1>
        <p className="text-ink-secondary mt-2 text-[14px]">
          {t("counterSubtitle", { handle: handle ?? t("theSeller") })}
        </p>

        {error && (
          <p className="bg-error-tint text-error mt-6 w-full max-w-[640px] rounded-10 p-3 text-[13px] font-medium">
            {t(`errors.${error}`)}
          </p>
        )}

        {/* card — 651:6402 */}
        <form
          action={counterTradeAction}
          className="bg-base border-line mt-8 flex w-full max-w-[640px] flex-col gap-4 rounded-20 border p-6 drop-shadow-[0px_12px_16px_rgba(0,0,0,0.05)]"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={request.id} />

          {/* strip — 651:6403 */}
          <div className="bg-surface flex items-center gap-4 rounded-12 p-4">
            <TradeThumb listing={theirs} className="size-13" bg="bg-tint" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className="text-ink truncate text-[13px] font-semibold"
                dir="auto"
              >
                {theirs?.title ?? t("itemUnavailable")}
              </span>
              <span className="text-ink-secondary text-[12px]" dir="auto">
                {t("theirItemValueInline", {
                  amount: formatPrice(sides.theirValue, currency),
                })}
              </span>
            </div>

            <span className="text-azure shrink-0 text-[20px] font-bold" aria-hidden>
              ⇄
            </span>

            <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
              <span
                className="text-ink truncate text-[13px] font-semibold"
                dir="auto"
              >
                {mine?.title ?? t("itemUnavailable")}
              </span>
              <span className="text-ink-secondary text-[12px]" dir="auto">
                {t("yourItemValueInline", {
                  amount: formatPrice(sides.myValue, currency),
                })}
              </span>
            </div>
            <TradeThumb listing={mine} className="size-13" bg="bg-tint" />
          </div>

          <span className="text-ink text-[14px] font-semibold">
            {t("cashDifference")}
          </span>

          <CounterAmount
            name="amount"
            defaultValue={startingAmount}
            currencyLabel={currency}
            directionLabel={t("theyPayYou")}
            resetLabel={t("setToZero")}
            helpText={t("counterHelp")}
          />

          {/* recalc — 651:6428 */}
          <CashBreakdown
            variant="panel"
            cash={cash}
            theirValue={sides.theirValue}
            myValue={sides.myValue}
            currency={currency}
            labels={{ ...breakdownLabels(t), title: t("updatedBreakdown") }}
          />

          <label
            htmlFor="counter-note"
            className="text-ink text-[14px] font-semibold"
          >
            {t("addNote")}
          </label>
          {/* note — 651:6440 */}
          <textarea
            id="counter-note"
            name="note"
            maxLength={COUNTER_NOTE_MAX}
            placeholder={t("counterNotePlaceholder")}
            className="bg-base border-line text-ink placeholder:text-ink-tertiary h-24 w-full resize-none rounded-12 border p-4 text-[14px] outline-none"
          />

          {/* btn/primary — 651:6442 */}
          <button
            type="submit"
            className="bg-aqua text-on-accent h-13 w-full rounded-12 text-[15px] font-semibold"
          >
            {t("sendCounter")}
          </button>
        </form>

        {/* btn/secondary — 651:6444 */}
        <Link
          href={`/account/trades/${request.id}`}
          className="bg-base border-line text-ink mt-6 flex h-[46px] w-full max-w-[200px] items-center justify-center rounded-12 border text-[15px] font-semibold lg:ms-[340px]"
        >
          {t("cancel")}
        </Link>
      </div>
    </div>
  );
}

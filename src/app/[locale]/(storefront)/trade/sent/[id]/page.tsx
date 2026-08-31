import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTradeRequest } from "@/lib/api/endpoints/trade";
import { requireUser } from "@/lib/auth/current-user";
import { formatPrice } from "@/lib/format/money";
import { TradeThumb } from "@/features/trade/components/trade-item";
import { tradeCash, tradeSides } from "@/features/trade/helpers";

/**
 * Trade offer sent — Figma `651:6269` (Web_Trade_OfferSent).
 *
 * The confirmation the offer builder redirects to. The frame's four-step strip
 * is the offer's own lifecycle, not the hub timeline: only "Sent" is ever
 * reached here, since the page is shown the moment the request is created.
 */
export const metadata: Metadata = { robots: { index: false } };

const PROGRESS = ["sent", "awaiting", "accepted", "ship"] as const;

export default async function TradeOfferSentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/trade/sent/${id}`);

  const t = await getTranslations("Trade");

  const request = await getTradeRequest(id);
  if (!request) notFound();

  const sides = tradeSides(request, user.id);
  const cash = tradeCash(request, sides, user.id);
  const mine = sides.mine[0] ?? null;
  const theirs = sides.theirs[0] ?? null;
  const currency = request.currency ?? "SAR";
  const handle = theirs?.seller?.handle ? `@${theirs.seller.handle}` : null;

  return (
    <div className="bg-surface flex flex-col items-center px-4 pt-14 pb-14">
      {/* card — 651:6284 */}
      <div className="bg-elevated border-line-subtle flex w-full max-w-[640px] flex-col items-center rounded-20 border p-10 drop-shadow-[0px_16px_20px_rgba(0,0,0,0.08)]">
        <span className="bg-success-tint3 text-success flex size-18 items-center justify-center rounded-full text-[34px] font-bold">
          ✓
        </span>

        <h1 className="text-ink mt-4 text-[24px] font-bold">
          {t("sentTitle")}
        </h1>
        <p className="text-ink-secondary mt-3 max-w-[480px] text-center text-[14px]">
          {t("sentBody", { handle: handle ?? t("theSeller") })}
        </p>

        <span className="bg-line-subtle mt-8 h-px w-full" aria-hidden />

        {/* YOU OFFER / YOU RECEIVE — 651:6290 */}
        <div className="mt-6 flex w-full items-center justify-between">
          <span className="text-ink-tertiary text-[10px] font-bold">
            {t("youOfferCap")}
          </span>
          <span className="text-ink-tertiary text-[10px] font-bold">
            {t("youReceiveCap")}
          </span>
        </div>

        <div className="mt-3 flex w-full items-center gap-4">
          <TradeThumb listing={mine} className="size-13" bg="bg-tint" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-ink truncate text-[13px] font-semibold" dir="auto">
              {mine?.title ?? t("itemUnavailable")}
            </span>
            <span className="text-ink-secondary text-[12px]" dir="auto">
              {formatPrice(sides.myValue, currency)}
            </span>
          </div>

          <span className="text-azure shrink-0 text-[22px] font-bold" aria-hidden>
            ⇄
          </span>

          <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
            <span className="text-ink truncate text-[13px] font-semibold" dir="auto">
              {theirs?.title ?? t("itemUnavailable")}
            </span>
            <span className="text-ink-secondary text-[12px]" dir="auto">
              {formatPrice(sides.theirValue, currency)}
            </span>
          </div>
          <TradeThumb listing={theirs} className="size-13" bg="bg-tint" />
        </div>

        {/* diff — 651:6299 */}
        <div className="bg-tint mt-6 flex h-12 w-full items-center justify-between rounded-12 px-4">
          <span className="text-ink-secondary text-[14px] font-medium">
            {cash.isEven
              ? t("evenTrade")
              : cash.difference < 0
                ? t("cashYouPayFlat")
                : t("cashYouReceiveFlat")}
          </span>
          <span className="text-ink text-[15px] font-bold" dir="ltr">
            {formatPrice(Math.abs(cash.difference), currency)}
          </span>
        </div>

        <p className="text-ink-tertiary mt-4 max-w-[560px] text-center text-[12px]">
          {t("sentFeeNote")}
        </p>

        <span className="bg-line-subtle mt-6 h-px w-full" aria-hidden />

        {/* Progress — 651:6304 */}
        <ol className="mt-6 flex w-full flex-wrap items-center gap-2">
          {PROGRESS.map((key, index) => (
            <li key={key} className="flex items-center gap-2">
              <span
                className={`size-3.5 shrink-0 rounded-full ${
                  index === 0 ? "bg-success" : "bg-line"
                }`}
                aria-hidden
              />
              <span
                className={`text-[11px] ${
                  index === 0
                    ? "text-ink font-semibold"
                    : "text-ink-tertiary"
                }`}
              >
                {t(`sentProgress.${key}`)}
              </span>
              {index < PROGRESS.length - 1 && (
                <span className="bg-line h-0.5 w-[34px]" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        {/* btn/primary — 651:6315 */}
        <Link
          href={`/account/trades/${request.id}`}
          className="bg-aqua text-on-accent mt-6 flex h-12 w-full items-center justify-center rounded-12 text-[15px] font-semibold"
        >
          {t("viewTradeStatus")}
        </Link>
      </div>

      {/* btn/secondary — 651:6317 */}
      <Link
        href="/trade"
        className="bg-base border-line text-ink mt-6 flex h-[46px] w-full max-w-[280px] items-center justify-center rounded-12 border text-[15px] font-semibold"
      >
        {t("backToBrowsing")}
      </Link>
    </div>
  );
}

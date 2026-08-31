import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getListing } from "@/lib/api/endpoints/listings";
import { getTradeCloset } from "@/lib/api/endpoints/trade";
import { requireUser } from "@/lib/auth/current-user";
import { coverPhotoUrl, type Listing } from "@/lib/api/schemas/listing";
import { TRADE_MESSAGE_MAX } from "@/lib/api/schemas/trade";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { createTradeRequestAction } from "@/features/trade/actions";
import { OfferPicker } from "@/features/trade/components/offer-picker";

/**
 * Offer a trade — Figma `651:6112` (Step 1) and `651:6205` (Step 2).
 *
 * Drawn as a modal over the product page; here it is a route, so a shared or
 * refreshed link lands on the same step rather than an empty overlay. Step 1
 * hands its choice to step 2 through the query string.
 *
 * The note is carried on the query string between the steps and sent as
 * `message` on the create call, which also posts it as the opening line of the
 * trade conversation (GAP-84).
 */
export const metadata: Metadata = { robots: { index: false } };

const NEXT_STEPS = [
  { key: "notified", tint: "bg-action-tint text-action" },
  { key: "respond", tint: "bg-info-tint text-info" },
  { key: "ship", tint: "bg-warn-tint text-amber-deep" },
  { key: "authenticate", tint: "bg-action-tint text-action" },
] as const;

export default async function TradeOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, listingId } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/trade/offer/${listingId}`);

  const t = await getTranslations("Trade");
  const tListing = await getTranslations("Listing");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const chosenId = typeof query.offered === "string" ? query.offered : null;
  const note = typeof query.note === "string" ? query.note.trim() : "";

  const [target, closet] = await Promise.all([
    getListing(listingId),
    getTradeCloset(),
  ]);
  if (!target) notFound();

  const chosen = chosenId
    ? (closet.find((item) => item.id === chosenId) ?? null)
    : null;
  const step = chosen ? 2 : 1;
  const currency = target.currency ?? "SAR";
  // The detail endpoint calls the handle `username`; the list one calls it `handle`.
  const handle = target.seller?.username ? `@${target.seller.username}` : null;

  return (
    <div className="bg-surface flex justify-center px-4 py-10">
      {/* Modal — 651:6112 / 651:6205 */}
      <div
        className={`bg-base w-full self-start rounded-20 ${
          step === 1 ? "max-w-[640px]" : "max-w-[560px]"
        }`}
      >
        {/* ModalHdr — 651:6113 */}
        <div className="flex flex-col items-start gap-3 px-6 pt-5">
          <div className="flex w-full items-center justify-between">
            <h1 className="text-ink-900 text-[18px] font-semibold">
              {step === 1 ? t("offerTitle") : t("reviewTitle")}
            </h1>
            <Link
              href={`/products/${listingId}`}
              aria-label={t("close")}
              className="bg-fill-100 text-ink-500 flex size-8 items-center justify-center rounded-16"
            >
              <X className="size-3.5" strokeWidth={3} aria-hidden />
            </Link>
          </div>

          {step === 1 && (
            <p className="text-ink-500 text-[13px]">{t("offerSubtitle")}</p>
          )}

          <div className="flex w-full items-center gap-2" aria-hidden>
            <span className="bg-action h-1 flex-1 rounded-[2px]" />
            <span
              className={`h-1 flex-1 rounded-[2px] ${
                step === 2 ? "bg-action" : "bg-line-200"
              }`}
            />
          </div>
          <span className="text-ink-400 text-[11px]">
            {t("stepOf", { step, total: 2 })}
          </span>
          <span className="bg-line-200 h-px w-full" aria-hidden />
        </div>

        {error && (
          <p className="bg-error-tint text-error mx-6 mt-4 rounded-10 p-3 text-[13px]">
            {t(`errors.${error}`)}
          </p>
        )}

        {step === 1 ? (
          /* Body1 — 651:6124 */
          <form method="get" className="flex flex-col items-start gap-3 px-6 pt-4">
            {/* TheirItem — 651:6125 */}
            <div className="bg-fill-50 border-line-200 flex w-full items-center gap-3 rounded-12 border p-3">
              <Thumb listing={target} className="size-12 rounded-8" />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                <span className="text-ink-400 text-[10px]">
                  {t("theyAreOffering")}
                </span>
                <span
                  className="text-ink-900 w-full truncate text-[13px] font-semibold"
                  dir="auto"
                >
                  {target.title}
                </span>
                <span className="text-ink-500 text-[11px]" dir="auto">
                  {formatPrice(target.price, currency)}
                  {target.condition
                    ? `  ·  ${tListing(`conditions.${target.condition}`)}`
                    : ""}
                </span>
              </div>
            </div>

            {closet.length === 0 ? (
              <div className="border-line-200 w-full rounded-12 border border-dashed p-10 text-center">
                <p className="text-ink-900 mb-2 text-[15px] font-semibold">
                  {t("closetEmptyTitle")}
                </p>
                <p className="text-ink-500 mb-6 text-[13px]">
                  {t("closetEmptyBody")}
                </p>
                <Link
                  href="/sell"
                  className="bg-action text-base inline-flex h-11 items-center rounded-[22px] px-6 text-[13px] font-bold"
                >
                  {t("closetEmptyCta")}
                </Link>
              </div>
            ) : (
              <>
                <OfferPicker
                  name="offered"
                  items={closet.map((item) => ({
                    id: item.id,
                    title: item.title,
                    price: formatPrice(item.price, item.currency ?? currency),
                    category: item.category?.name ?? null,
                    photoUrl: resolveMediaUrl(coverPhotoUrl(item)),
                  }))}
                  searchPlaceholder={t("searchYours")}
                  countLabel={t("yourListings", { count: closet.length })}
                  emptyLabel={t("noMatches")}
                />

                {/* Col — 651:6191 */}
                <div className="flex w-full flex-col items-start gap-1.5 pb-1">
                  <label
                    htmlFor="trade-note"
                    className="text-ink-500 text-[12px] font-medium"
                  >
                    {t("noteLabel")}
                  </label>
                  <textarea
                    id="trade-note"
                    name="note"
                    defaultValue={note}
                    maxLength={TRADE_MESSAGE_MAX}
                    placeholder={t("notePlaceholder")}
                    className="bg-fill-50 border-line-200 text-ink-900 placeholder:text-ink-400 h-[60px] w-full resize-none rounded-10 border pt-2.5 ps-3 text-[12px] outline-none"
                  />
                </div>

                {/* ModalFtr — 651:6196 */}
                <div className="bg-line-200 -mx-6 h-px w-[calc(100%+3rem)]" aria-hidden />
                <div className="flex w-full items-center justify-end gap-3 pt-4 pb-5">
                  <Link
                    href={`/products/${listingId}`}
                    className="border-line-200 text-ink-900 flex h-11 items-center justify-center rounded-[22px] border px-5 text-[13px] font-medium"
                  >
                    {t("cancel")}
                  </Link>
                  <button
                    type="submit"
                    className="bg-action text-base flex h-11 items-center justify-center rounded-[22px] px-6 text-[13px] font-bold"
                  >
                    {t("reviewOffer")}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          /* Body2 — 651:6216 */
          <form
            action={createTradeRequestAction}
            className="flex flex-col items-start gap-4 px-6 pt-5"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="offeredListingIds" value={chosen!.id} />
            {note && <input type="hidden" name="note" value={note} />}

            {/* Row — 651:6217 */}
            <div className="flex w-full items-center gap-3">
              <SwapCard
                tone="bg-action-tint"
                titleTone="text-action"
                caption={t("youOffer")}
                listing={chosen}
                price={formatPrice(chosen!.price, chosen!.currency ?? currency)}
                by={t("you")}
              />
              <span
                className="bg-base border-line-200 text-ink-500 flex size-8 shrink-0 items-center justify-center rounded-16 border text-[11px] font-bold"
                aria-hidden
              >
                {"<>"}
              </span>
              <SwapCard
                tone="bg-info-tint2"
                titleTone="text-info"
                caption={t("theyOffer")}
                listing={target}
                price={formatPrice(target.price, currency)}
                by={handle ?? t("theSeller")}
              />
            </div>

            {/* NotePreview — 651:6236 */}
            {note && (
              <div className="bg-fill-50 border-line-200 flex w-full flex-col items-start gap-1 rounded-10 border p-3">
                <span className="text-ink-400 text-[10px] font-bold">
                  {t("yourNote")}
                </span>
                <span className="text-ink-900 text-[12px]" dir="auto">
                  {note}
                </span>
              </div>
            )}

            <span className="bg-line-200 h-px w-full" aria-hidden />

            <h2 className="text-ink-900 text-[13px] font-semibold">
              {t("nextTitle")}
            </h2>
            {/* Col — 651:6241 */}
            <ol className="flex w-full flex-col items-start gap-2">
              {NEXT_STEPS.map(({ key, tint }, index) => (
                <li key={key} className="flex w-full items-center gap-2.5">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-12 text-[11px] font-bold ${tint}`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-ink-900 text-[13px]">
                    {t(`next.${key}`, { handle: handle ?? t("theSeller") })}
                  </span>
                </li>
              ))}
            </ol>

            {/* Row — 651:6258 */}
            <div className="flex w-full items-center gap-1.5">
              <span className="bg-action-tint text-action flex size-4 shrink-0 items-center justify-center rounded-8 text-[9px] font-bold">
                i
              </span>
              <span className="text-ink-500 text-[11px]">
                {t("holdNotice")}
              </span>
            </div>

            {/* ModalFtr — 651:6263 */}
            <div className="bg-line-200 -mx-6 h-px w-[calc(100%+3rem)]" aria-hidden />
            <div className="flex w-full items-center justify-end gap-3 pt-4 pb-5">
              <Link
                href={`/trade/offer/${listingId}${note ? `?note=${encodeURIComponent(note)}` : ""}`}
                className="border-line-200 text-ink-900 flex h-11 items-center justify-center rounded-[22px] border px-5 text-[13px] font-medium"
              >
                {t("back")}
              </Link>
              <button
                type="submit"
                className="bg-action text-base flex h-11 items-center justify-center rounded-[22px] px-6 text-[13px] font-bold"
              >
                {t("sendOffer")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Thumb({
  listing,
  className,
}: {
  listing: Listing | null;
  className: string;
}) {
  const url = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;
  return (
    <span
      className={`bg-fill-100 block shrink-0 overflow-hidden ${className}`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
        <img src={url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}

/** TC — 651:6218 / 651:6228. */
function SwapCard({
  tone,
  titleTone,
  caption,
  listing,
  price,
  by,
}: {
  tone: string;
  titleTone: string;
  caption: string;
  listing: Listing | null;
  price: string;
  by: string;
}) {
  return (
    <div
      className={`border-line-200 flex min-w-0 flex-1 flex-col items-start gap-2 rounded-12 border px-3 py-3.5 ${tone}`}
    >
      <span className="text-ink-400 text-[10px] font-bold">{caption}</span>
      <div className="flex w-full items-center gap-2.5">
        <span className="bg-base border-line-200 block size-11 shrink-0 overflow-hidden rounded-8 border-[0.5px]">
          {listing && resolveMediaUrl(coverPhotoUrl(listing)) && (
            // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
            <img
              src={resolveMediaUrl(coverPhotoUrl(listing))!}
              alt=""
              className="size-full object-cover"
            />
          )}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-[3px]">
          <span
            className={`w-full truncate text-[12px] font-semibold ${titleTone}`}
            dir="auto"
          >
            {listing?.title}
          </span>
          <span className="text-ink-900 text-[11px] font-bold" dir="ltr">
            {price}
          </span>
          <span className="text-ink-500 text-[10px]" dir="auto">
            {by}
          </span>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getListings } from "@/lib/api/endpoints/listings";
import { getTradeCloset } from "@/lib/api/endpoints/trade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { coverPhotoUrl, type Listing } from "@/lib/api/schemas/listing";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";

/**
 * Trade hub — Figma `651:6008` (Web_TradePage).
 *
 * The hero's three stats have no endpoint — there are no platform trade
 * counters (API-22) — so they are translated copy, matching the frame.
 * `GET /trade/suggestions` and its skip are mapped to this route by
 * plans/04, but the frame draws a plain catalogue grid and nothing else, so
 * neither is called here (plans/09).
 */
export const metadata: Metadata = {
  title: "Trade",
};

const STEPS = ["find", "negotiate", "ship", "exchange"] as const;
const STATS = ["trades", "commission", "completion"] as const;

export default async function TradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Trade");
  const user = await getCurrentUser();

  const [catalogue, closet] = await Promise.all([
    getListings({ saleMode: "trade", limit: 4 }),
    user ? getTradeCloset().catch(() => []) : Promise.resolve([]),
  ]);

  const canOffer = closet.length > 0;

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:6009 */}
      <section className="bg-ink-900">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-10 lg:h-[260px] lg:flex-row lg:items-center lg:gap-[60px] lg:px-20 lg:py-0">
          {/* HL — 651:6010 */}
          <div className="flex flex-1 flex-col items-start gap-3">
            {/* NB — 651:6011 */}
            <span className="bg-action-deep text-aqua flex h-[26px] items-center justify-center rounded-[13px] px-3 text-[10px] font-bold">
              {t("badge")}
            </span>
            <h1 className="text-base text-[32px] font-bold">
              {t("heroTitle")}
            </h1>
            <p className="text-ink-400 text-[15px]">
              {t("heroLine1")}
              <br />
              {t("heroLine2")}
            </p>
            {/* HB — 651:6015 */}
            <div className="flex items-start gap-3">
              <Link
                href="#browse"
                className="bg-aqua flex h-12 items-center justify-center rounded-[24px] px-7 text-[14px] font-bold text-black"
              >
                {t("start")}
              </Link>
              <Link
                href="#how"
                className="border-ink-700 text-base flex h-12 items-center justify-center rounded-[24px] border px-7 text-[14px] font-medium"
              >
                {t("how")}
              </Link>
            </div>
          </div>

          {/* HS — 651:6020 */}
          <div className="flex flex-col items-start gap-4">
            {STATS.map((key) => (
              <div
                key={key}
                className="bg-ink-800 border-ink-700 flex w-full items-center rounded-12 border px-4 py-3 lg:w-[280px]"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-aqua text-[16px] font-bold" dir="auto">
                    {t(`stats.${key}.value`)}
                  </span>
                  <span className="text-ink-500 text-[11px]">
                    {t(`stats.${key}.label`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HIW — 651:6033 */}
      <section id="how" className="bg-base">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-12 lg:px-20">
          <h2 className="text-ink-900 text-[24px] font-bold">
            {t("howTitle")}
          </h2>
          {/* HR — 651:6035 */}
          <ol className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="bg-fill-50 border-line-200 flex flex-col items-start gap-3 rounded-12 border p-5"
              >
                {/* C — 651:6037 */}
                <span className="bg-ink-900 text-aqua flex size-9 items-center justify-center rounded-[18px] text-[14px] font-bold">
                  {index + 1}
                </span>
                <span className="text-ink-900 text-[15px] font-semibold">
                  {t(`steps.${step}.title`)}
                </span>
                <span className="text-ink-500 text-[12px]">
                  {t(`steps.${step}.body`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Browse — 651:6056 */}
      <section id="browse" className="bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-6 px-4 pt-12 pb-16 lg:px-20">
          {/* BH — 651:6057 */}
          <div className="flex w-full items-center justify-between">
            <h2 className="text-ink-900 text-[24px] font-bold">
              {t("browseTitle")}
            </h2>
            <Link
              href="/products?saleMode=trade"
              className="text-action flex items-center gap-1 text-[14px] font-medium"
            >
              {t("viewAll")}
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>

          {/* IR — 651:6060 */}
          {catalogue.items.length === 0 ? (
            <p className="text-ink-500 border-line-200 w-full rounded-[14px] border border-dashed p-14 text-center text-[13px]">
              {t("emptyCatalogue")}
            </p>
          ) : (
            <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {catalogue.items.map((listing) => (
                <TradeCard
                  key={listing.id}
                  listing={listing}
                  canOffer={canOffer}
                  cta={t("offerTrade")}
                  blocked={user ? t("listToOffer") : t("signInToOffer")}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Card — 651:6061. */
function TradeCard({
  listing,
  canOffer,
  cta,
  blocked,
}: {
  listing: Listing;
  canOffer: boolean;
  cta: string;
  blocked: string;
}) {
  const photo = resolveMediaUrl(coverPhotoUrl(listing));
  const size = listing.attributes?.size;

  return (
    <article className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border">
      {/* Img — 651:6062 */}
      <Link
        href={`/products/${listing.id}`}
        className="bg-fill-100 flex h-[200px] items-center justify-center overflow-hidden"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img
            src={photo}
            alt={listing.title}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <ArrowLeftRight className="text-ink-400 size-8" aria-hidden />
        )}
      </Link>

      {/* C — 651:6064 */}
      <div className="flex flex-col items-start gap-1.5 p-3">
        <Link
          href={`/products/${listing.id}`}
          className="text-ink-900 w-full truncate text-[13px] font-semibold"
          dir="auto"
        >
          {listing.title}
        </Link>

        {/* M — 651:6066 */}
        <div className="flex items-start gap-1.5 text-[11px]">
          {listing.category?.name && (
            <span className="text-ink-500" dir="auto">
              {listing.category.name}
            </span>
          )}
          {typeof size === "string" && (
            <span className="text-ink-400" dir="auto">
              {size}
            </span>
          )}
        </div>

        <span className="text-ink-900 text-[14px] font-bold" dir="ltr">
          {formatPrice(listing.price, listing.currency ?? "SAR")}
        </span>

        {/* Offer — 651:6070 */}
        {canOffer ? (
          <Link
            href={`/trade/offer/${listing.id}`}
            className="border-aqua text-action flex h-[38px] w-full items-center justify-center gap-1.5 rounded-10 border-[1.5px] text-[12px] font-bold"
          >
            <ArrowLeftRight className="size-4" aria-hidden />
            {cta}
          </Link>
        ) : (
          <span className="border-line-200 text-ink-400 flex h-[38px] w-full items-center justify-center rounded-10 border-[1.5px] px-2 text-center text-[12px] font-bold">
            {blocked}
          </span>
        )}
      </div>
    </article>
  );
}

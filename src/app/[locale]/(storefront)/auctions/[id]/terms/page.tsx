import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getListing } from "@/lib/api/endpoints/listings";
import { getAuctionStatus } from "@/lib/api/endpoints/auctions";
import { amountOf } from "@/lib/api/schemas/auction";
import { requireUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AuctionCountdown } from "@/features/auctions/components/auction-countdown";
import { acceptAuctionTermsAction } from "@/features/auctions/actions";

/**
 * Auction terms — Figma `651:7062` (Web_Auction_Terms).
 *
 * The gate before a first bid: `POST /listings/{id}/auction-entry` records
 * `termsAcceptedAt` and takes the entry fee, and bidding 403s without it.
 *
 * The ten clauses are design copy, not API content — they live in `messages/`
 * so they translate, and are numbered from the list rather than hand-placed.
 */
export const metadata: Metadata = { robots: { index: false } };

const CLAUSES = [
  "eligibility",
  "binding",
  "entryFee",
  "antiSnipe",
  "reserve",
  "winning",
  "nonPayment",
  "authenticity",
  "cancellation",
  "law",
] as const;

export default async function AuctionTermsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/auctions/${id}/terms`);

  const t = await getTranslations("AuctionTerms");
  const tAuctions = await getTranslations("Auctions");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const listing = await getListing(id);
  if (!listing || listing.saleMode !== "auction") notFound();

  // Live numbers rather than the listing's snapshot — this page can sit open.
  const status = await getAuctionStatus(id).catch(() => null);
  const currentBid =
    amountOf(status?.currentBid) ||
    amountOf(status?.startingBid) ||
    amountOf(listing.startingBid);
  const bidCount = status?.bidCount ?? listing.bidCount ?? 0;
  const endsAt = status?.auctionEndsAt ?? listing.auctionEndsAt ?? null;
  const currency = listing.currency ?? "SAR";
  const photo = resolveMediaUrl(listing.photos?.[0]?.url ?? null);

  return (
    <div className="bg-surface pb-14">
      {/* content — 651:7076 */}
      <div className="mx-auto w-full max-w-[960px] px-4 pt-12 lg:px-0">
        <h1 className="text-[32px] leading-[44.8px] font-bold">{t("title")}</h1>
        <p className="text-ink-secondary mt-1 text-[14px]">{t("subtitle")}</p>

        <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* clauses — 651:7079 */}
            <ol className="bg-base border-line flex flex-col gap-[26px] rounded-16 border p-6">
              {CLAUSES.map((clause, index) => (
                <li key={clause} className="flex gap-3.5">
                  <span className="bg-fill-100 text-ink-secondary flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold">
                      {t(`clauses.${clause}.title`)}
                    </span>
                    <span className="text-ink-secondary text-[13px] leading-[18.2px]">
                      {t(`clauses.${clause}.body`)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            {error && (
              <p className="text-error text-[13px] font-medium" role="alert">
                {t(`errors.${error}`)}
              </p>
            )}

            {/* agree — 651:7120 */}
            <form action={acceptAuctionTermsAction} className="flex flex-col gap-5">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="listingId" value={listing.id} />

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agree"
                  className="border-line accent-aqua mt-0.5 size-[22px] shrink-0 rounded-6 border-[1.5px]"
                />
                <span className="text-[14px] font-medium">{t("agreeLabel")}</span>
              </label>

              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  className="bg-aqua text-on-accent flex h-[50px] w-full max-w-[300px] items-center justify-center rounded-12 text-[15px] font-semibold"
                >
                  {t("agreeCta")}
                </button>
                <Link
                  href={`/products/${listing.id}`}
                  className="bg-base border-line flex h-[50px] w-[180px] items-center justify-center rounded-12 border text-[15px] font-semibold"
                >
                  {t("cancel")}
                </Link>
              </div>
            </form>
          </div>

          {/* lot — 651:7126 */}
          <aside className="bg-base border-line flex w-full shrink-0 flex-col rounded-16 border p-3.5 lg:w-[300px]">
            <div className="bg-fill-100 relative h-[150px] overflow-hidden rounded-12">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img src={photo} alt="" className="size-full object-cover" />
              )}
              <span className="bg-error-tint2 text-error absolute start-2 top-2 flex h-[22px] items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px]">
                {t("auctionBadge")}
              </span>
            </div>

            {listing.brand?.name && (
              <p
                className="text-ink-tertiary mt-3 truncate text-[10px] font-bold uppercase"
                dir="auto"
              >
                {listing.brand.name}
              </p>
            )}
            <p className="mt-1 truncate text-[16px] font-semibold" dir="auto">
              {listing.title}
            </p>

            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-ink-tertiary text-[12px]">
                  {tAuctions("currentBid")}
                </span>
                <span className="text-[18px] font-bold" dir="ltr">
                  {formatPrice(currentBid, currency)}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {endsAt && (
                  <span className="text-warning text-[12px] font-semibold">
                    {t("ends")}{" "}
                    <AuctionCountdown
                      endsAt={endsAt}
                      endedLabel={tAuctions("ended")}
                      variant="clock"
                    />
                  </span>
                )}
                <span className="text-ink-secondary text-[12px]">
                  {tAuctions("bids", { count: bidCount })}
                </span>
              </span>
            </div>

            <span className="bg-warn-tint text-warning mt-3 flex h-[22px] w-fit items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px]">
              {t("ageBadge")}
            </span>
          </aside>
        </div>
      </div>
    </div>
  );
}

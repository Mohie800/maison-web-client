import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getListing } from "@/lib/api/endpoints/listings";
import { getAuctionPayment } from "@/lib/api/endpoints/auctions";
import { getAddresses, getPaymentMethods } from "@/lib/api/endpoints/checkout";
import { amountOf } from "@/lib/api/schemas/auction";
import { requireUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { AuctionCountdown } from "@/features/auctions/components/auction-countdown";
import { payAuctionAction } from "@/features/auctions/actions";

/**
 * Auction won — payment — Figma `651:7207` (Web_AuctionWon_Payment).
 *
 * Reached after `GET /listings/{id}/auction-payment` says something is due;
 * that call 404s for everyone else, which is what sends a non-winner to a 404
 * rather than a page of blanks.
 *
 * The breakdown rows are driven by the fields the response actually carries.
 * That shape is unverified — no auction on dev has settled yet (GAP-68) — so a
 * row whose field is absent is dropped rather than printed as SAR 0.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function AuctionPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/auctions/${id}/payment`);

  const t = await getTranslations("AuctionPayment");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const payment = await getAuctionPayment(id);
  if (!payment) notFound();

  const [listing, addresses, cards] = await Promise.all([
    getListing(id),
    getAddresses().catch(() => []),
    getPaymentMethods().catch(() => []),
  ]);
  if (!listing) notFound();

  const currency = payment.currency ?? listing.currency ?? "SAR";
  const address = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const card = cards.find((c) => c.isDefault) ?? cards[0] ?? null;
  const photo = resolveMediaUrl(listing.photos?.[0]?.url ?? null);
  const total = amountOf(payment.totalAmount);

  const rows = [
    { key: "winningBid", value: payment.winningBid },
    { key: "shipping", value: payment.shippingAmount },
    { key: "vat", value: payment.vatAmount },
    { key: "buyerPremium", value: payment.buyerPremiumAmount },
  ].filter((row) => row.value !== null && row.value !== undefined);

  return (
    <div className="bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 pt-6 pb-20 lg:px-20">
        {/* WinBanner — 651:7208 */}
        <div className="bg-action-tint border-action flex flex-wrap items-center gap-4 rounded-16 border px-6 py-5">
          <span className="bg-action flex size-11 shrink-0 items-center justify-center rounded-full text-[24px]">
            🏆
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-action text-[20px] font-bold">{t("title")}</p>
            <p className="text-ink-500 text-[13px]">
              {t("subtitle", { hours: listing.paymentWindowHours ?? 24 })}
            </p>
          </div>
          {payment.dueAt && (
            <span className="bg-error-tint text-error flex h-10 shrink-0 items-center rounded-20 px-4 text-[13px] font-bold">
              <AuctionCountdown
                endsAt={payment.dueAt}
                endedLabel={t("overdue")}
                variant="clock"
              />
              <span className="ms-1">{t("remaining")}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* WonItem — 651:7218 */}
            <div className="bg-base border-line flex items-center gap-4 rounded-[14px] border p-4">
              <span className="bg-fill-100 size-[72px] shrink-0 overflow-hidden rounded-10">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img src={photo} alt="" className="size-full object-cover" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="truncate text-[16px] font-semibold" dir="auto">
                  {listing.title}
                </p>
                {listing.seller?.username && (
                  <p className="text-ink-500 truncate text-[12px]" dir="auto">
                    @{listing.seller.username}
                  </p>
                )}
                <span className="bg-action-tint text-action flex h-6 w-fit items-center rounded-12 px-2.5 text-[11px] font-bold">
                  {t("wonBadge")}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[20px] font-bold" dir="ltr">
                  {formatPrice(amountOf(payment.winningBid), currency)}
                </span>
                <span className="text-ink-tertiary text-[11px]">
                  {t("winningBid")}
                </span>
              </div>
            </div>

            {/* AddrCard — 651:7229 */}
            <section className="bg-base border-line flex flex-col gap-3 rounded-[14px] border p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-semibold">{t("address")}</h2>
                <Link
                  href="/account/settings"
                  className="text-action text-[12px] font-medium"
                >
                  {t("change")}
                </Link>
              </div>
              {address ? (
                <p className="bg-action-tint border-action flex flex-wrap items-center gap-2.5 rounded-10 border px-3.5 py-3 text-[13px]">
                  {address.isDefault && (
                    <span className="bg-action flex h-5 items-center rounded-10 px-1.5 text-[8px] font-bold text-white">
                      {t("default")}
                    </span>
                  )}
                  <span dir="auto">
                    {[
                      address.recipientName,
                      address.street,
                      address.city,
                      address.phone,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </span>
                </p>
              ) : (
                <Link
                  href="/account/settings"
                  className="border-line text-ink-secondary rounded-10 border border-dashed px-3.5 py-3 text-[13px]"
                >
                  {t("noAddress")}
                </Link>
              )}
            </section>

            {/* PMCard — 651:7237 */}
            <section className="bg-base border-line flex flex-col gap-3 rounded-[14px] border p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-semibold">{t("payment")}</h2>
                <Link
                  href="/account/wallet/payment-methods"
                  className="text-action text-[12px] font-medium"
                >
                  {t("change")}
                </Link>
              </div>
              {card ? (
                <p className="bg-action-tint border-action flex items-center gap-3 rounded-10 border px-3.5 py-3 text-[13px]">
                  <span className="bg-base text-info flex h-9 items-center rounded-8 px-2 text-[9px] font-bold uppercase">
                    {card.cardBrand ?? t("card")}
                  </span>
                  <span dir="ltr">
                    {t("cardLine", {
                      brand: card.cardBrand ?? t("card"),
                      last4: card.cardLast4 ?? "••••",
                    })}
                  </span>
                </p>
              ) : (
                <Link
                  href="/account/wallet/payment-methods"
                  className="border-line text-ink-secondary rounded-10 border border-dashed px-3.5 py-3 text-[13px]"
                >
                  {t("noCard")}
                </Link>
              )}
            </section>

            {error && (
              <p className="text-error text-[13px] font-medium" role="alert">
                {t(`errors.${error}` as "errors.requestFailed")}
              </p>
            )}

            {/* PayBtn — 651:7245 */}
            <form action={payAuctionAction} className="flex flex-col gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="listingId" value={id} />
              <button
                type="submit"
                disabled={!card || !address}
                className="bg-action flex h-14 items-center justify-center rounded-[28px] text-[16px] font-bold text-white disabled:opacity-50"
              >
                {t("confirmFor", { amount: formatPrice(total, currency) })}
              </button>
              <p className="text-ink-tertiary text-center text-[12px]">
                {t("binding")}
              </p>
            </form>
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[462px]">
            {/* SumCard — 651:7249 */}
            <section className="bg-base border-line flex flex-col gap-3 rounded-[14px] border p-5">
              <h2 className="text-[16px] font-semibold">{t("summary")}</h2>
              <div className="bg-line h-px w-full" />
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-start justify-between gap-3 py-0.5 text-[12px]"
                >
                  <span className="text-ink-500">{t(`rows.${row.key}`)}</span>
                  <span dir="ltr">
                    {formatPrice(amountOf(row.value), currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3 py-0.5 text-[12px]">
                <span className="text-ink-500">{t("rows.protection")}</span>
                <span>{t("included")}</span>
              </div>
              <div className="bg-line h-px w-full" />
              <div className="flex items-center justify-between gap-3 font-bold">
                <span className="text-[14px]">{t("total")}</span>
                <span className="text-[20px]" dir="ltr">
                  {formatPrice(total, currency)}
                </span>
              </div>
            </section>

            {/* ProtCard — 651:7268 */}
            <section className="bg-action-tint border-action flex flex-col gap-2 rounded-12 border p-3.5">
              <h2 className="text-action text-[13px] font-semibold">
                {t("protectionTitle")}
              </h2>
              {(["authenticated", "refund", "held"] as const).map((line) => (
                <p key={line} className="flex items-center gap-2">
                  <span className="bg-action flex size-4 shrink-0 items-center justify-center rounded-8">
                    <Check className="size-2.5 text-white" aria-hidden />
                  </span>
                  <span className="text-ink-500 text-[11px]">
                    {t(`protection.${line}`)}
                  </span>
                </p>
              ))}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

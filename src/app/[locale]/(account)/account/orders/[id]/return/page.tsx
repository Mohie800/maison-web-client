import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOrder } from "@/lib/api/endpoints/orders";
import { getReturnEligibility } from "@/lib/api/endpoints/returns";
import {
  INELIGIBLE_REASONS,
  NOTE_MAX,
  RETURN_REASONS,
  requiresPhotos,
} from "@/lib/api/schemas/return";
import { formatPrice } from "@/lib/format/money";
import { requestReturnAction } from "@/features/returns/actions";
import { ReturnReasonPicker } from "@/features/returns/components/return-reason-picker";

/**
 * Request a return — Figma `651:8506` (Web_ReturnRequest).
 *
 * `GET /returns/eligibility/{orderId}` decides what can be returned and for how
 * much, so an order past its window shows the reason rather than a form that
 * would be rejected.
 *
 * Three deviations, recorded in plans/09 C35:
 *
 * - Six reasons, not the frame's five. `CreateReturnDto.reason` is a closed
 *   enum; four of the frame's five map to it exactly, "Wrong item received"
 *   has no member and folds into "Something else", and `wrong_size` is an
 *   API reason the frame doesn't draw.
 * - The three fault reasons need evidence. `POST /media` turns each picked
 *   file into a URL (GAP-72), so
 *   choosing one explains that and points at support instead of failing.
 * - "Preferred refund method" is cut: the DTO has no field for it, so the
 *   choice would not reach anyone.
 *
 * One line the frame does not draw: what return shipping costs, and that the
 * three seller's-fault reasons waive it. Both come from the eligibility
 * response since GAP-94, and the reason is picked here — so this is where the
 * buyer can still act on it.
 */
export const metadata: Metadata = { robots: { index: false } };

function ineligibleMessage(
  code: string | null,
  t: (key: string) => string,
): string {
  return (INELIGIBLE_REASONS as readonly string[]).includes(code ?? "")
    ? t(`ineligible.${code}`)
    : t("ineligible.unknown");
}

export default async function ReturnRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Returns");
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const [eligibility, order] = await Promise.all([
    getReturnEligibility(id),
    getOrder(id).catch(() => null),
  ]);

  const items = eligibility.items.filter((item) => item.eligible !== false);
  const blocked = eligibility.items.filter((item) => item.eligible === false);
  if (eligibility.items.length === 0) notFound();

  const currency = eligibility.currency ?? order?.currency ?? "SAR";
  const reference = order?.orderNumber ?? null;
  const shippingFee = Number(eligibility.returnShippingFee ?? 0) || 0;
  const waivedFor: string[] = eligibility.returnShippingWaivedFor ?? [];

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 px-4 pt-8">
        {/* Hdr — 651:8507 */}
        <nav className="text-ink-tertiary flex w-full gap-1.5 text-[12px]">
          <Link href="/account/orders" className="text-action">
            {t("breadcrumbOrders")}
          </Link>
          <span aria-hidden>›</span>
          <Link href={`/account/orders/${id}`} className="text-action truncate">
            {reference ? t("breadcrumbOrder", { number: reference }) : id}
          </Link>
          <span aria-hidden>›</span>
          <span>{t("breadcrumbReturn")}</span>
        </nav>

        <h1 className="text-[28px] font-bold">{t("title")}</h1>
        <p className="text-ink-500 text-[14px]">{t("subtitle")}</p>

        {items.length === 0 ? (
          <div className="bg-base border-line w-full rounded-16 border p-8 text-center">
            <p className="text-body-lg mb-2">{t("noneEligibleTitle")}</p>
            <p className="text-body text-ink-secondary">
              {/* The API returns a code, not prose — "already_returned". */}
              {ineligibleMessage(blocked[0]?.ineligibleReason ?? null, t)}
            </p>
          </div>
        ) : (
          /* Form — 651:8515 */
          <form
            action={requestReturnAction}
            className="bg-base border-line flex w-full flex-col gap-5 rounded-16 border p-7"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="orderId" value={id} />

            {/* Item — 651:8516. Checkboxes because a return may cover several. */}
            <div className="flex flex-col gap-2.5">
              {items.map((item) => (
                <label
                  key={item.orderItemId}
                  className="bg-fill-50 border-line has-checked:border-action flex cursor-pointer items-center gap-3 rounded-12 border p-3"
                >
                  <input
                    type="checkbox"
                    name="orderItemIds"
                    value={item.orderItemId}
                    defaultChecked={items.length === 1}
                    className="accent-action size-4 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className="truncate text-[14px] font-semibold"
                      dir="auto"
                    >
                      {item.title}
                    </span>
                    <span className="text-ink-500 text-[12px]">
                      {item.daysLeftToReturn != null
                        ? t("daysLeft", { count: item.daysLeftToReturn })
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-bold" dir="ltr">
                    {formatPrice(item.price, currency)}
                  </span>
                </label>
              ))}
            </div>

            {blocked.length > 0 && (
              <p className="text-ink-tertiary text-[12px]">
                {t("someIneligible", { count: blocked.length })}
              </p>
            )}

            {error && (
              <p className="text-error text-[13px] font-medium" role="alert">
                {t(`errors.${error}` as "errors.requestFailed")}
              </p>
            )}

            {/* RW — 651:8524, DW — 651:8542, PW — 651:8546 */}
            <ReturnReasonPicker
              reasons={RETURN_REASONS.map((reason) => ({
                value: reason,
                label: t(`reasons.${reason}`),
                needsPhotos: requiresPhotos(reason),
                /* The fee is waived on the seller's-fault reasons — the same
                   three that require photos, and the API states which (GAP-94). */
                waivesShipping: waivedFor.includes(reason),
              }))}
              chargesShipping={shippingFee > 0}
              labels={{
                legend: t("reasonLegend"),
                describe: t("describeLegend"),
                placeholder: t("describePlaceholder"),
                noteLimit: t("noteLimit", { max: NOTE_MAX }),
                photosLegend: t("photosLegend"),
                photosRequired: t("photosRequired"),
                submit: t("submit"),
                footnote: t("footnote", {
                  days: eligibility.returnWindowDays ?? 7,
                }),
                shippingFee: t("shippingFeeNote", {
                  amount: formatPrice(shippingFee, currency),
                }),
                shippingWaived: t("shippingWaivedNote"),
              }}
              noteMax={NOTE_MAX}
            />
          </form>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale, getFormatter } from "next-intl/server";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getReturn } from "@/lib/api/endpoints/returns";
import {
  RETURN_STEP_FIELDS,
  RETURN_TIMELINE,
  type ReturnStatus,
} from "@/lib/api/schemas/return";
import { formatPrice } from "@/lib/format/money";
import { cancelReturnAction } from "@/features/returns/actions";

/**
 * Return status — Figma `651:8569` (Web_Returns_StatusTimeline), with
 * `651:8624` (Web_Returns_Confirmed) as the just-created banner.
 *
 * The timeline is driven by the API's own status ladder rather than a fixed
 * list of five, for the same reason the order tracking timeline is (GAP-46):
 * a hardcoded ladder shows a step as reached because of its position rather
 * than because it happened.
 *
 * Deviations, recorded in plans/09 C35: the frame's "Seller notified" is drawn
 * from `approved` — there is no notification status — and `pickup_scheduled`
 * is a real state the frame has no step for, so it is added.
 *
 * The frame also puts a thumbnail on the item card and splits the refund into
 * price minus return shipping. `GET /returns/{id}` has no response schema in
 * the OpenAPI document and no return has ever existed on dev, so neither field
 * can be confirmed to exist; both are drawn only when present (GAP-94).
 */
export const metadata: Metadata = { robots: { index: false } };

const REACHED_BADGE: Record<string, string> = {
  requested: "bg-warn-tint text-warning",
  approved: "bg-info-tint text-info",
  pickup_scheduled: "bg-info-tint text-info",
  in_transit: "bg-info-tint text-info",
  delivered_to_seller: "bg-warn-tint text-warning",
  refunded: "bg-success-tint text-success",
  rejected: "bg-error-tint text-error",
  cancelled: "bg-fill-100 text-ink-500",
};

export default async function ReturnStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Returns");
  const format = await getFormatter();
  const query = await searchParams;
  const created = query.created === "1";
  const error = typeof query.error === "string" ? query.error : null;

  const request = await getReturn(id);
  if (!request) notFound();

  const status = (request.status ?? "requested") as ReturnStatus;
  const currency = request.currency ?? "SAR";
  const item = request.items?.[0] ?? null;

  // Each step is reached because it carries a timestamp, never because of
  // where it sits in the list — the return has a column per state.
  const steps = RETURN_TIMELINE.map((step) => {
    const at = request[RETURN_STEP_FIELDS[step]] ?? null;
    return { status: step, at, reached: Boolean(at), current: step === status };
  });

  const terminal = status === "cancelled" || status === "rejected";
  const cancellable = status === "requested" || status === "approved";

  const when = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="bg-surface pb-14">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 pt-12 lg:px-20">
        {created && (
          /* Web_Returns_Confirmed — 651:8624 */
          <p className="bg-success-tint text-success mb-6 flex items-center gap-3 rounded-16 px-5 py-4 text-[14px] font-medium">
            <span className="bg-success flex size-7 shrink-0 items-center justify-center rounded-full">
              <Check className="text-base size-4" aria-hidden />
            </span>
            {t("created")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold" dir="ltr">
            {t("returnRef", {
              id: request.returnNumber ?? id.slice(0, 8).toUpperCase(),
            })}
          </h1>
          <span
            className={`flex h-[22px] items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px] uppercase ${
              REACHED_BADGE[status] ?? "bg-fill-100 text-ink-500"
            }`}
          >
            {t(`statuses.${status}` as "statuses.requested")}
          </span>
        </div>
        <p className="text-ink-secondary mt-1 text-[14px]">
          {[
            when(request.requestedAt ?? request.createdAt ?? null)
              ? t("requestedOn", {
                  at: when(request.requestedAt ?? request.createdAt ?? null)!,
                })
              : null,
            request.orderId
              ? t("breadcrumbOrder", { number: request.orderId.slice(0, 8) })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* item — 651:8580 */}
            {item && (
              <div className="bg-base border-line flex items-center gap-4 rounded-[14px] border p-4">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold" dir="auto">
                    {item.titleSnapshot}
                  </span>
                  <span className="text-ink-secondary text-[13px]" dir="ltr">
                    {formatPrice(item.priceSnapshot, currency)}
                  </span>
                  {request.reason && (
                    <span className="text-ink-tertiary text-[12px] font-medium">
                      {t("reasonLine", {
                        reason: t(
                          `reasons.${request.reason}` as "reasons.other",
                        ),
                      })}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* timeline — 651:8585 */}
            <section className="bg-base border-line flex flex-col gap-5 rounded-16 border p-6">
              <h2 className="text-[16px] font-semibold">{t("progress")}</h2>
              <ol className="flex flex-col">
                {steps.map((step, index) => (
                  <li key={step.status} className="flex gap-3">
                    <span className="flex flex-col items-center">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                          step.reached
                            ? "bg-success text-base"
                            : "bg-fill-100 text-ink-tertiary"
                        }`}
                      >
                        {step.reached ? (
                          <Check className="size-3.5" aria-hidden />
                        ) : (
                          ""
                        )}
                      </span>
                      {index < steps.length - 1 && (
                        <span
                          className={`w-0.5 flex-1 ${step.reached ? "bg-success" : "bg-line"}`}
                        />
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5 pb-5">
                      <span
                        className={`text-[14px] ${
                          step.current
                            ? "font-semibold"
                            : step.reached
                              ? "font-medium"
                              : "text-ink-tertiary font-medium"
                        }`}
                      >
                        {t(`statuses.${step.status}` as "statuses.requested")}
                      </span>
                      <span
                        className={`text-[12px] ${
                          step.current && !step.at
                            ? "text-warning"
                            : "text-ink-tertiary"
                        }`}
                      >
                        {when(step.at) ??
                          (step.current
                            ? t("inProgress")
                            : step.reached
                              ? ""
                              : t("pending"))}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {status === "rejected" && request.rejectionReason && (
                <p className="bg-error-tint text-error rounded-10 px-3.5 py-2.5 text-[13px]">
                  <span className="font-semibold">{t("rejectedLabel")}: </span>
                  {request.rejectionReason}
                </p>
              )}
            </section>
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px]">
            {/* refund — 651:8609 */}
            {request.refundAmount != null && (
              <section className="bg-surface flex flex-col gap-3 rounded-16 p-5">
                <h2 className="text-[14px] font-semibold">{t("refundTitle")}</h2>
                <div className="bg-line-subtle h-px w-full" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold">
                    {t("refundAmount")}
                  </span>
                  <span className="text-success text-[16px] font-bold" dir="ltr">
                    {formatPrice(request.refundAmount, currency)}
                  </span>
                </div>
                {request.refundMethodSnapshot && (
                  <p className="text-ink-secondary text-[12px]" dir="ltr">
                    {request.refundMethodSnapshot}
                  </p>
                )}
                <p className="text-ink-tertiary text-[11px]">
                  {t("refundNote")}
                </p>
              </section>
            )}

            {request.trackingNumber && (
              <section className="bg-base border-line flex flex-col gap-1 rounded-16 border p-5">
                <h2 className="text-[14px] font-semibold">
                  {t("trackingLabel")}
                </h2>
                <p className="text-ink-secondary text-[12px]">
                  {request.trackingCarrier}
                </p>
                <p className="text-[13px] font-semibold" dir="ltr">
                  {request.trackingNumber}
                </p>
              </section>
            )}

            {/* support — 651:8619 */}
            <section className="bg-base border-line flex flex-col gap-3 rounded-16 border p-5">
              <h2 className="text-[14px] font-semibold">{t("helpTitle")}</h2>
              <p className="text-ink-secondary text-[12px]">{t("helpBody")}</p>
              <Link
                href="/help/contact"
                className="bg-base border-line flex h-10 items-center justify-center rounded-12 border text-[15px] font-semibold"
              >
                {t("contactSupportCta")}
              </Link>
            </section>

            {error && (
              <p className="text-error text-[13px] font-medium" role="alert">
                {t(`errors.${error}` as "errors.requestFailed")}
              </p>
            )}

            {cancellable && !terminal && (
              <form action={cancelReturnAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="returnId" value={id} />
                <button
                  type="submit"
                  className="text-error text-[13px] font-medium underline"
                >
                  {t("cancelReturn")}
                </button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download } from "lucide-react";

/**
 * Reports — `651:15642` light / `651:13062` dark.
 *
 * **There is no export endpoint**, so all six reports are built here, from data
 * the portal already reads, assembled into CSV by `app/api/vendor/reports/[type]`.
 *
 * The **Tax Summary** was the last one missing and works since Round 9 added
 * `order.vatAmount` (GAP-115). It reports VAT *collected from buyers and
 * remitted by the platform* — not a seller liability — and labels the column
 * with the rate and collector from `/settings/fees` so the two 15% figures can
 * never be mistaken for each other.
 *
 * The frame's **Recent Downloads** list is not built. Reports are generated per
 * request and never stored, so there is nothing to list — and a list that is
 * always empty is worse than no list (plans/09 C81).
 */
export const metadata: Metadata = { robots: { index: false } };

const CARDS = [
  { key: "sales", type: "sales", tone: "text-action dark:text-aqua border-action" },
  { key: "orders", type: "orders", tone: "text-info border-info" },
  { key: "tax", type: "tax", tone: "text-amber-deep border-amber-deep" },
  { key: "payments", type: "payments", tone: "text-purple border-purple" },
  { key: "inventory", type: "inventory", tone: "text-error border-error" },
  { key: "customers", type: "customers", tone: "text-action dark:text-aqua border-action" },
] as const;

export default async function VendorReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Vendor.reports");

  return (
    <>
      {/* TB — 651:15693 */}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-ink-900 truncate text-[24px] leading-[29px] font-bold">
          {t("title")}
        </h1>
        <p className="text-ink-500 dark:text-ink-450 truncate text-[13px] leading-4">
          {t("subtitle")}
        </p>
      </div>

      {/* RGrid — 651:15698 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {CARDS.map((card) => (
          /* RC — 651:15699 */
          <div
            key={card.key}
            className="bg-base dark:bg-tint border-line-200 rounded-12 flex items-center gap-3.5 border p-4"
          >
            <span
              className={`bg-fill-100 flex size-9 shrink-0 items-center justify-center rounded-[18px] ${card.tone.split(" ")[0]}`}
            >
              <Download className="size-4" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-ink-900 truncate text-[13px] font-semibold">
                {t(`cards.${card.key}.title`)}
              </p>
              {/* The tax card's line is a reason, not a label — let it wrap. */}
              <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                {card.type ? t(`cards.${card.key}.body`) : t("taxNote")}
              </p>
            </div>
            {card.type ? (
              /* A real file, streamed by the route handler. */
              <a
                href={`/api/vendor/reports/${card.type}`}
                download
                className={`rounded-8 flex h-8 shrink-0 items-center border px-3 text-[10px] font-medium ${card.tone}`}
              >
                {t("download")}
              </a>
            ) : (
              <span className="border-line-200 text-ink-400 dark:text-ink-450 rounded-8 flex h-8 shrink-0 cursor-not-allowed items-center border px-3 text-[10px] font-medium">
                {t("unavailable")}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

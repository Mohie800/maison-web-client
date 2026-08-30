import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * OTHER PAYMENT METHODS — Figma `651:7740`.
 *
 * The design lists five: Mada, STC Pay, Apple Pay, Tabby and Tamara. Only the
 * first two are rendered. Apple Pay and the BNPL providers are real API payment
 * types but need a provider SDK or a redirect flow to complete, so a row that
 * opens a form we can't finish would be a dead end. See plans/09 C24.
 */
const OFFERED = [
  { type: "mada", tile: "MA" },
  { type: "stc_pay", tile: "ST" },
] as const;

export async function OtherPaymentMethods({
  hrefFor,
}: {
  hrefFor: (type: string) => string;
}) {
  const t = await getTranslations("Checkout");

  return (
    <ul className="flex flex-col gap-3">
      {OFFERED.map((entry) => (
        <li key={entry.type}>
          <Link
            href={hrefFor(entry.type)}
            className="border-line flex items-center gap-3 rounded-12 border p-3"
          >
            <span
              aria-hidden
              className="bg-tint text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            >
              {entry.tile}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label">{t(`paymentTypes.${entry.type}`)}</span>
              <span className="text-caption text-ink-tertiary">
                {t(`paymentBlurbs.${entry.type}`)}
              </span>
            </span>
            <ChevronRight
              className="text-ink-tertiary size-4 shrink-0 rtl:rotate-180"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

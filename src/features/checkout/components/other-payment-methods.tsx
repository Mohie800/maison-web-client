import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import type { BnplOption } from "@/lib/api/schemas/bnpl";
import { startBnplCheckout } from "../actions";

/**
 * OTHER PAYMENT METHODS — Figma `651:7740`.
 *
 * The design lists five: Mada, STC Pay, Apple Pay, Tabby and Tamara. Apple Pay
 * is not rendered: it needs the Payment Request API and a merchant session.
 * See plans/09 C25.
 */
const OFFERED = [
  { type: "mada", tile: "MA" },
  { type: "stc_pay", tile: "ST" },
] as const;

const BNPL_TILES = { tabby: "TB", tamara: "TM" } as const;

const rowClass = "border-line flex items-center gap-3 rounded-12 border p-3";

export async function OtherPaymentMethods({
  hrefFor,
  bnpl,
  bnplFields,
  currency,
}: {
  hrefFor: (type: string) => string;
  /** From `GET /payments/bnpl/options`; `not_enabled` rows are hidden. */
  bnpl: BnplOption[];
  /** The checkout body plus `returnTo`, posted with the chosen provider. */
  bnplFields: Record<string, string>;
  currency: string;
}) {
  const t = await getTranslations("Checkout");

  return (
    <ul className="flex flex-col gap-3">
      {OFFERED.map((entry) => (
        <li key={entry.type}>
          <Link href={hrefFor(entry.type)} className={rowClass}>
            <Tile>{entry.tile}</Tile>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label">{t(`paymentTypes.${entry.type}`)}</span>
              <span className="text-caption text-ink-tertiary">
                {t(`paymentBlurbs.${entry.type}`)}
              </span>
            </span>
            <Chevron />
          </Link>
        </li>
      ))}

      {bnpl
        .filter((option) => option.reason !== "not_enabled")
        .map((option) => {
          const name = t(`paymentTypes.${option.provider}`);
          const blurb = t(`bnpl.blurb.${option.provider}`, {
            instalments: option.instalments,
            amount: formatPrice(option.instalmentAmount, currency),
          });

          if (!option.available) {
            return (
              <li key={option.provider}>
                <div className={`${rowClass} opacity-50`} aria-disabled>
                  <Tile>{BNPL_TILES[option.provider]}</Tile>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label">{name}</span>
                    <span className="text-caption text-ink-tertiary">
                      {rangeNote(t, option, currency)}
                    </span>
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={option.provider}>
              <form action={startBnplCheckout}>
                {Object.entries(bnplFields).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
                <input type="hidden" name="provider" value={option.provider} />
                <button type="submit" className={`${rowClass} w-full text-start`}>
                  <Tile>{BNPL_TILES[option.provider]}</Tile>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label">{name}</span>
                    <span className="text-caption text-ink-tertiary">{blurb}</span>
                  </span>
                  <Chevron />
                </button>
              </form>
            </li>
          );
        })}
    </ul>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/** "Available for orders between SAR 100 and SAR 1,000" — or the one bound there is. */
export function rangeNote(
  t: Translate,
  option: BnplOption,
  currency: string,
): string {
  const min = formatPrice(option.minAmount, currency);
  const max = formatPrice(option.maxAmount, currency);
  if (option.maxAmount === null) return t("bnpl.rangeMin", { min });
  if (!(Number(option.minAmount) > 0)) return t("bnpl.rangeMax", { max });
  return t("bnpl.range", { min, max });
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="bg-tint text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
    >
      {children}
    </span>
  );
}

function Chevron() {
  return (
    <ChevronRight
      className="text-ink-tertiary size-4 shrink-0 rtl:rotate-180"
      aria-hidden
    />
  );
}

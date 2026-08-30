import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format/money";
import { formatDayRange } from "@/lib/format/date";
import type { ShippingOption } from "@/lib/api/schemas/checkout";
import type { Locale } from "@/i18n/routing";

/**
 * Shipping method picker — Figma `651:7551`.
 *
 * The design's three rows are the three rows `/shipping-options` actually
 * returns (express, standard, seller_pickup), so everything on them is real:
 * the tile letters come from `code`, "Tracked" from `isTracked`, and the date
 * window from `etaMinDays`/`etaMaxDays` counted from today.
 */
export async function ShippingMethods({
  options,
  chosenId,
  hrefFor,
}: {
  options: ShippingOption[];
  chosenId?: string | null;
  hrefFor: (optionId: string) => string;
}) {
  const t = await getTranslations("Checkout");
  const locale = (await getLocale()) as Locale;

  /**
   * "FASTEST" goes to the quickest *delivered* option. Pickup reports a 0-day
   * ETA because there is no transit, which would otherwise always win it.
   */
  const delivered = options.filter((o) => !o.isPickup);
  const fastestId =
    delivered.length > 1
      ? delivered.reduce((best, o) =>
          (o.etaMaxDays ?? Infinity) < (best.etaMaxDays ?? Infinity) ? o : best,
        ).id
      : null;

  return (
    <ul className="flex flex-col gap-3">
      {options.map((option) => {
        const active = option.id === chosenId;
        const free = Number(option.price ?? 0) === 0;

        const meta = option.isPickup
          ? t("coordinateWithSeller")
          : [
              option.etaMaxDays != null
                ? t("estimated", {
                    range: formatDayRange(
                      option.etaMinDays ?? 0,
                      option.etaMaxDays,
                      locale,
                    ),
                  })
                : null,
              option.isTracked ? t("tracked") : null,
            ]
              .filter(Boolean)
              .join(" · ");

        return (
          <li key={option.id}>
            <Link
              href={hrefFor(option.id)}
              aria-current={active ? "true" : undefined}
              className={`flex items-center gap-3 rounded-12 border p-3 ${
                active ? "border-action bg-action-tint" : "border-line"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-action" : "bg-tint"
                }`}
              >
                {active && <span className="size-1.5 rounded-full bg-white" />}
              </span>

              <span
                aria-hidden
                className="bg-tint text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-8 text-[11px] font-bold"
              >
                {tileLetters(option)}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label">
                  {pickLocalized(option, "name", locale)}
                </span>
                {meta && (
                  <span className="text-caption text-ink-tertiary">{meta}</span>
                )}
              </span>

              <span className="flex shrink-0 flex-col items-end">
                <span className="text-label">
                  {free ? t("free") : formatPrice(option.price)}
                </span>
                {option.id === fastestId && (
                  <span className="text-action text-[10px] font-bold tracking-[0.06em] uppercase">
                    {t("fastest")}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** "EX", "ST", "PU" — the design's monogram tile. */
function tileLetters(option: ShippingOption): string {
  if (option.isPickup) return "PU";
  return (option.code || "??").slice(0, 2).toUpperCase();
}

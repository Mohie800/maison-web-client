import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format/money";
import { ToggleGlyph } from "./toggle";

/** The design's fixed tiers, alongside whatever round-up the server suggests. */
const TIERS = [5, 10, 25];

/**
 * Donate to Ehsan — Figma `651:7932`.
 *
 * `suggestedDonationAmount` is the server's round-up. The "your total goes from
 * X to Y" line is two real previews rather than arithmetic here: the page asks
 * for the totals with and without the donation and passes both in.
 */
export async function DonationCard({
  charityName,
  suggested,
  selected,
  totalWithout,
  totalWith,
  currency = "SAR",
  hrefFor,
  offHref,
}: {
  charityName: string;
  suggested: number;
  /** The donation currently applied, 0 when off. */
  selected: number;
  totalWithout: string | null;
  totalWith: string | null;
  currency?: string;
  hrefFor: (amount: number) => string;
  offHref: string;
}) {
  const t = await getTranslations("Checkout");
  const on = selected > 0;
  const amounts = [...new Set([...(suggested > 0 ? [suggested] : []), ...TIERS])];

  return (
    <div className="border-line rounded-12 border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-label">{t("donateTitle", { charity: charityName })}</h3>
          <p className="text-caption text-ink-tertiary mt-0.5">{t("donateBody")}</p>
        </div>
        <Link
          href={on ? offHref : hrefFor(suggested > 0 ? suggested : TIERS[0])}
          aria-label={on ? t("donateOff") : t("donateOn")}
        >
          <ToggleGlyph on={on} />
        </Link>
      </div>

      {on && (
        <>
          {suggested > 0 && (
            <div className="bg-warn-tint mt-4 flex items-center justify-between gap-4 rounded-8 px-3 py-2">
              <span className="text-caption text-amber-text">{t("roundUp")}</span>
              <span className="text-label text-amber-deep">
                {formatPrice(String(suggested), currency)}
              </span>
            </div>
          )}

          {totalWithout && totalWith && (
            <p className="text-caption text-amber-text mt-2">
              {t("totalGoesFromTo", {
                from: formatPrice(totalWithout, currency),
                to: formatPrice(totalWith, currency),
              })}
            </p>
          )}

          <ul className="mt-3 flex flex-wrap gap-2">
            {amounts.map((amount) => {
              const active = amount === selected;
              return (
                <li key={amount}>
                  <Link
                    href={hrefFor(amount)}
                    className={`text-label flex h-10 items-center rounded-[20px] px-5 ${
                      active
                        ? "bg-aqua text-on-accent font-semibold"
                        : "bg-tint text-ink-secondary"
                    }`}
                  >
                    {formatPrice(String(amount), currency)}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="text-caption text-ink-tertiary mt-3">{t("donateFootnote")}</p>
        </>
      )}
    </div>
  );
}

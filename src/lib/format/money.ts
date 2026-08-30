import type { Locale } from "@/i18n/routing";

/**
 * The API returns money as decimal strings ("150", "22.50", "4200.00") in SAR.
 *
 * These are formatted WITHOUT going through `Number`. Not because a listing
 * price would overflow a float — it wouldn't — but because the moment a
 * money-shaped value becomes a number, someone downstream adds two of them.
 * Keeping it textual end-to-end means the only totals we can display are the
 * ones the server computed, which is the rule for this codebase.
 *
 * Digits stay Western (1234, not ١٢٣٤) in both locales: Saudi commerce UIs
 * conventionally use Latin numerals for prices, and the `ar` locale default
 * would otherwise switch them.
 */

const GROUP_SEPARATOR = ",";
const DECIMAL_SEPARATOR = ".";

function groupDigits(digits: string): string {
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += GROUP_SEPARATOR;
    out += digits[i];
  }
  return out;
}

/**
 * "4200.00" → "4,200"  ·  "22.50" → "22.50"  ·  "150" → "150"  ·  "103.5" → "103.50"
 *
 * Accepts a number as well as a string. The API is inconsistent — `/listings`
 * returns `price` as a string, `/trends` as a number — and schema validation is
 * non-fatal in production, so a raw payload can reach here unnormalised. That
 * is not a reason to crash a product page.
 */
export function formatAmount(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";

  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string") return "";

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;

  const [rawInt = "0", rawFraction = ""] = unsigned.split(DECIMAL_SEPARATOR);

  /**
   * Either no decimals or exactly two — never one.
   *
   * A zero fraction carries no meaning, so 4200.00 → 4,200. Anything else is
   * padded rather than trimmed: the API sends halves as "103.5" and "13.5", and
   * printing those as "SAR 103.5" is not a money format. Never truncated, so a
   * longer fraction is left alone rather than silently rounded.
   */
  const fraction = /^0*$/.test(rawFraction) ? "" : rawFraction.padEnd(2, "0");

  const formatted =
    groupDigits(rawInt) + (fraction ? DECIMAL_SEPARATOR + fraction : "");

  return negative ? `-${formatted}` : formatted;
}

/**
 * "4200.00" → "SAR 4,200".
 *
 * The design places the currency code before the amount in both locales
 * (see WEB-HOMEPAGE-1440), so the order is not flipped for Arabic.
 */
export function formatPrice(
  value: string | number | null | undefined,
  currency = "SAR",
): string {
  const amount = formatAmount(value);
  return amount ? `${currency} ${amount}` : "";
}

/** Discount percentage from original vs current price, or null if not on sale. */
export function discountPercent(
  originalPrice: string | number | null | undefined,
  price: string | number | null | undefined,
): number | null {
  if (!originalPrice || !price) return null;
  const original = Number(originalPrice);
  const current = Number(price);
  if (!Number.isFinite(original) || !Number.isFinite(current)) return null;
  if (original <= 0 || current >= original) return null;
  return Math.round(((original - current) / original) * 100);
}

/** Locale-aware compact counts: "3,432 views". */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

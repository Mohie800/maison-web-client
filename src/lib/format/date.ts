import type { Locale } from "@/i18n/routing";

/**
 * Date formatting, matching the money convention in `money.ts`: digits stay
 * Western in both locales (`ar-SA-u-nu-latn`), because Saudi commerce UIs
 * conventionally use Latin numerals and the `ar` default would otherwise switch
 * them mid-sentence.
 *
 * The order screens inline this same `Intl.DateTimeFormat` call in three
 * places; this is the same behaviour extracted so the wallet's several date
 * surfaces don't add three more copies.
 */

function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB";
}

/** "13 May 2026" */
export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "13 May 2026, 14:34" */
export function formatDateTime(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * "15 min ago" — the story viewer's timestamp (Figma `651:2144`).
 *
 * Picks the largest unit that fits, so a story posted this morning reads in
 * hours rather than 380 minutes. Same Latin-digit rule as the rest of the file.
 */
export function formatRelative(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), {
    numeric: "auto",
  });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(Math.round(seconds), "second");
}

/**
 * "15–17 Apr" — the delivery window on the shipping step (Figma `651:7551`).
 *
 * The design shows dates; the API gives `etaMinDays` / `etaMaxDays` counted from
 * today, so the dates are derived here. The month is printed once when both ends
 * fall in it, twice when they straddle ("30 Apr – 2 May").
 */
export function formatDayRange(
  minDays: number,
  maxDays: number,
  locale: Locale,
): string {
  const day = 86_400_000;
  const from = new Date(Date.now() + minDays * day);
  const to = new Date(Date.now() + maxDays * day);

  const dayOnly = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
  });

  if (minDays === maxDays) return dayMonth.format(to);
  if (from.getMonth() === to.getMonth()) {
    return `${dayOnly.format(from)}–${dayMonth.format(to)}`;
  }
  return `${dayMonth.format(from)} – ${dayMonth.format(to)}`;
}

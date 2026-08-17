import type { Locale } from "@/i18n/routing";

/**
 * The API returns both languages on every localised record (nameEn/nameAr,
 * titleEn/titleAr, …) rather than negotiating via Accept-Language, so the
 * client picks. Arabic values come back `null` in live data even where the
 * English value is set, so this always falls back rather than rendering empty.
 */
export function pickLocalized<
  Field extends string,
  Record extends Partial<
    { [K in `${Field}En` | `${Field}Ar`]: string | null }
  >,
>(record: Record, field: Field, locale: Locale): string {
  const en = record[`${field}En` as keyof Record] as string | null | undefined;
  const ar = record[`${field}Ar` as keyof Record] as string | null | undefined;

  return (locale === "ar" ? (ar ?? en) : (en ?? ar)) ?? "";
}

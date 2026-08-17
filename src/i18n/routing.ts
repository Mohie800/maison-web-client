import { defineRouting } from "next-intl/routing";

/**
 * Maison ships Arabic and English.
 *
 * `localePrefix: "always"` keeps both locales on an explicit prefix (/ar, /en).
 * The alternative ("as-needed", which drops the prefix for the default locale)
 * makes the Arabic and English URLs structurally different, which complicates
 * hreflang, canonical URLs, and analytics on a marketplace that needs both
 * locales indexed equally.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Text direction per locale. Arabic is RTL. */
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

/** Display names, each written in its own language. */
export const localeLabels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

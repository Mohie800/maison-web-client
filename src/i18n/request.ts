import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Corresponds to the [locale] segment.
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    /**
     * SAR everywhere — the API returns `"currency": "SAR"` on every listing and
     * exposes no FX endpoint. See plans/06 G5 before adding a currency switcher.
     *
     * `-u-nu-latn` forces Western Arabic numerals (1234) rather than Eastern
     * (١٢٣٤). Saudi commerce UIs conventionally use Western digits for prices,
     * and the locale default would otherwise switch them.
     */
    formats: {
      number: {
        currency: {
          style: "currency",
          currency: "SAR",
          numberingSystem: "latn",
        },
      },
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
      },
    },
    // The API returns ISO 8601 UTC timestamps.
    timeZone: "Asia/Riyadh",
  };
});

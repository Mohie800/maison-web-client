import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localeDirection, type Locale } from "@/i18n/routing";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "../globals.css";

/**
 * Inter is the design system's typeface but has no Arabic coverage, so Arabic
 * needs a second family. Both are loaded as CSS variables and selected in CSS
 * by `:lang()` — see globals.css.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Open Graph wants a full `language_TERRITORY` tag, not the bare language code
 * the routing uses. Saudi Arabia is the market, so `ar_SA` rather than `ar_AR`.
 */
const ogLocale: Record<Locale, string> = { en: "en_US", ar: "ar_SA" };

/**
 * The share card: the login screen's brand panel — gradient, topographic
 * pattern, logo — at the 1200x630 Open Graph reference size. Nothing localised
 * is baked into it, so one file serves both locales; the translated wording
 * rides along in og:title / og:description.
 */
const shareImage = {
  url: "/brand/og-image.png",
  width: 1200,
  height: 630,
  alt: "Maison Sale",
};

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "Meta",
  });

  const title = t("title");
  const description = t("description");

  return {
    /*
      og:image has to be an absolute URL — crawlers fetch it out of band, with
      no page to resolve a relative path against. metadataBase is what Next
      prefixes onto the relative path below; without it Next falls back to
      localhost and the card is unloadable for every scraper.
    */
    metadataBase: new URL("https://maison.dockbox.cloud"),
    title: { default: title, template: `%s · ${title}` },
    description,
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: `/${locale}`,
      locale: ogLocale[locale as Locale],
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => ogLocale[l]),
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for child Server Components.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`${inter.variable} ${arabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-base text-ink flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

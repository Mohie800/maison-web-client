import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { SocialLinks } from "./social-links";

/**
 * Site footer — Figma node 678:621. Rendered on `surface/invert`, which is the
 * deliberately-dark section treatment (dark in light mode too), not a theme.
 *
 * Exact spec: 80px gutters, 56px top / 32px bottom padding, 40px between the
 * six stacked blocks, a 320px brand column with 64px to the four link columns,
 * 13px type throughout the top block, then the trust marks, the social row, and
 * two hairline-separated legal rows.
 *
 * Because the surface is always inverted, `border/default` is pinned to its
 * light-mode value (#e2e4ea) rather than read from the theme token — the dark
 * token would be invisible here.
 */

const COLUMNS = [
  {
    key: "shop",
    links: [
      { key: "fashion", href: "/products" },
      { key: "electronics", href: "/products" },
      { key: "furniture", href: "/products" },
      { key: "toys", href: "/products" },
      { key: "auctions", href: "/auctions" },
    ],
  },
  {
    key: "sell",
    links: [
      { key: "startSelling", href: "/sell" },
      { key: "sellerGuide", href: "/seller-guide" },
      { key: "pricing", href: "/pricing" },
      { key: "dashboard", href: "/account" },
    ],
  },
  {
    key: "support",
    links: [
      { key: "helpCenter", href: "/help" },
      { key: "contactUs", href: "/help/contact" },
      { key: "faqs", href: "/help" },
      { key: "returns", href: "/help/returns" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "aboutUs", href: "/about" },
      { key: "blog", href: "/blog" },
      { key: "careers", href: "/about" },
      { key: "terms", href: "/about" },
      { key: "privacy", href: "/about" },
    ],
  },
] as const;

/** Brand names, so they stay Latin in both locales — as the design shows. */
const PAYMENT_METHODS = ["Mada", "STC", "Tabby", "Tamara", "Visa", "MC"];

/** Commercial registration and VAT numbers, transcribed from the design. */
const CR_NUMBER = "7054068460";
const VAT_NUMBER = "314734077200003";

const RULE = "h-px w-full shrink-0 bg-line";

/**
 * Trust marks all sit on the same light plate. The supplied art is dark-on-
 * transparent with soft (alpha ~200) edges, which goes muddy straight on
 * `surface/invert`; the padding also stands in for the clear space the files
 * are cropped without.
 */
function MarkPlate({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-8 flex h-[88px] shrink-0 items-center justify-center border border-line bg-white px-4">
      {children}
    </div>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="bg-invert mt-auto text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-14 pb-8 lg:px-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-col gap-4 lg:w-[320px] lg:shrink-0">
            {/*
              Dark-mode wordmark — the footer sits on `surface/invert`.
              `self-start` is load-bearing: this column is a flex-col, so the
              default `stretch` would pull the image to the full 320px and
              `w-auto` would resolve against that, squashing the logo.
            */}
            {/* width/height are the rendered size, not the file's — see the
                header. */}
            <Image
              src="/brand/logo-dark.png"
              alt="Maison Sale"
              width={154}
              height={65}
              className="h-[65px] w-auto self-start"
            />
            {/*
              The design sets this on two even lines. `text-balance` gets there
              in either language, where a width tuned to the English string
              would leave Arabic with a one-word last line.
            */}
            <p className="max-w-[240px] text-[13px] leading-5 text-balance text-white/70">
              {t("tagline")}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:gap-x-16">
            {COLUMNS.map((column) => (
              <div
                key={column.key}
                // `leading-[normal]` — the design's 12px column gaps are drawn
                // against Inter's natural line box, not the 20px body leading.
                className="flex flex-col gap-3 text-[13px] leading-[normal]"
              >
                <h2 className="font-bold">{t(`columns.${column.key}`)}</h2>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.key}>
                      <Link
                        href={link.href}
                        className="text-white/70 hover:text-white"
                      >
                        {t(`links.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/*
          Provenance and certification marks as one set. Heights are tuned per
          mark rather than shared: a wide lockup, a portrait badge and two
          roundels at the same pixel height read as wildly different sizes.
        */}
        {/* Two-up on mobile — free wrapping strands the last mark on its own
            row at 390px. */}
        <div className="grid grid-cols-2 justify-items-start gap-3 sm:flex sm:flex-wrap sm:items-center">
          <MarkPlate>
            <Image
              src="/brand/saudi-made.png"
              alt={t("marks.saudiMade")}
              width={111}
              height={36}
              className="h-9 w-auto"
            />
          </MarkPlate>
          <MarkPlate>
            <Image
              src="/brand/saudi-tech.png"
              alt={t("marks.saudiTech")}
              width={36}
              height={64}
              className="h-16 w-auto"
            />
          </MarkPlate>
          <MarkPlate>
            <Image
              src="/brand/iso-9001.png"
              alt={t("marks.iso9001")}
              width={65}
              height={64}
              className="h-16 w-auto"
            />
          </MarkPlate>
          <MarkPlate>
            <Image
              src="/brand/iso-27001.png"
              alt={t("marks.iso27001")}
              width={65}
              height={64}
              className="h-16 w-auto"
            />
          </MarkPlate>
        </div>

        <SocialLinks label={t("followUs")} />

        <div className={RULE} />

        <div className="flex items-center gap-5">
          {/* ZATCA VAT certificate mark — needs its own light plate. */}
          <div className="rounded-6 flex h-12 w-[100px] shrink-0 items-center justify-center border border-line bg-white">
            <Image
              src="/brand/zatca-vat.png"
              alt={t("marks.vat")}
              width={96}
              height={36}
              className="h-9 w-auto"
            />
          </div>
          <div className="flex flex-col gap-1 text-[12px]">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-white/60">{t("crNumber")}</span>
              <span className="font-semibold">{CR_NUMBER}</span>
            </p>
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-white/60">{t("vatNumber")}</span>
              <span className="font-semibold">{VAT_NUMBER}</span>
            </p>
          </div>
        </div>

        <div className={RULE} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <p className="flex-1 text-[12px] text-white/60">
            {t("copyright", { year: 2026 })}
          </p>
          <ul className="flex flex-wrap items-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-6 flex h-[26px] items-center justify-center border border-line/80 px-[10px] text-[10px] font-medium text-white/80"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

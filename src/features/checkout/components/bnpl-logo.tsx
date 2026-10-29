import Image from "next/image";
import type { BnplProvider } from "@/lib/api/schemas/bnpl";

/** Official badges: Tabby from docs.tabby.ai, Tamara from its merchant kit (Oct 2025). Use unaltered. */
const LOGOS = {
  tabby: { en: "/payments/tabby.svg", ar: "/payments/tabby.svg", ratio: 261.58 / 102.9 },
  tamara: { en: "/payments/tamara-en.png", ar: "/payments/tamara-ar.png", ratio: 295 / 96 },
} as const;

export function BnplLogo({
  provider,
  locale,
  height = 24,
  className = "",
}: {
  provider: BnplProvider;
  locale: string;
  height?: number;
  className?: string;
}) {
  const logo = LOGOS[provider];
  return (
    <Image
      src={locale === "ar" ? logo.ar : logo.en}
      alt="" // always shown beside the provider's name
      width={Math.round(height * logo.ratio)}
      height={height}
      className={`w-auto shrink-0 ${className}`}
      style={{ height }}
    />
  );
}

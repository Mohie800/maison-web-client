import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * The dark brand half of the auth split-screen — Figma node 651:16405.
 *
 * Exact values from the design: 720px of a 1440px frame, gradient from
 * `t/ink-900` (#111827) at 53% to `accent/aqua` (#56F1A3) at 278% — so almost
 * entirely dark with a green cast at the very bottom — and the topographic
 * pattern at 10% opacity across the lower half.
 *
 * Hidden below `lg`: at narrow widths the design's form column takes the full
 * screen, and a 900px-tall decorative panel above a login form would just push
 * the form off-screen.
 */
export async function AuthBrandPanel() {
  const t = await getTranslations("Auth");

  const stats = [
    { value: "50K+", label: t("statItems") },
    { value: "10K+", label: t("statSellers") },
    { value: "4", label: t("statCategories") },
  ];

  return (
    <div
      className="relative hidden w-1/2 shrink-0 flex-col items-center justify-center gap-8 overflow-hidden px-[60px] lg:flex"
      style={{
        backgroundImage:
          "linear-gradient(180.46deg, #111827 53.08%, #56f1a3 277.85%)",
      }}
    >
      {/*
        Decorative only — aria-hidden and non-interactive.

        The mask is what makes it read like the design: a hard-edged box would
        cut a visible horizontal line across the panel where the pattern starts.
        Fading the alpha from nothing at the top to full by ~55% of the box lets
        it emerge out of the dark instead.
      */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] opacity-10"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, #000 55%)",
        }}
        aria-hidden
      >
        {/*
          Eager, not lazy: this covers most of the panel, so the browser picks it
          as the LCP element. Deliberately not `priority` — that would also set
          fetchpriority="high" and make a decorative overlay compete with the
          logo, which is the thing worth painting first.
        */}
        <Image
          src="/brand/pattern.webp"
          alt=""
          fill
          loading="eager"
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover object-bottom"
        />
      </div>

      {/*
        width/height are the file's intrinsic 480×203, not the 240×101 display
        size. Declaring 240×101 gave a ratio of 2.3762 against the file's 2.3645
        (the export rounded 202.5 up), which is exactly what Next's
        "width or height modified, but not the other" warning catches. CSS does
        the sizing; `shrink-0` stops the flex column squashing it.
      */}
      <Image
        src="/brand/logo-dark.png"
        alt="Maison Sale"
        width={480}
        height={203}
        priority
        className="relative h-auto w-[240px] shrink-0"
      />

      <h2 className="relative max-w-[420px] text-center text-[28px] leading-tight font-bold text-balance text-white">
        {t("brandHeadline")}
      </h2>

      <p className="text-ink-400 relative max-w-[420px] text-center text-[15px] text-balance">
        {t("brandSubtitle")}
      </p>

      {/*
        These figures are in the design but have no endpoint behind them
        (API-22 — aggregate counts live only on /admin/overview). Kept because
        they are static marketing copy on a login screen rather than data we'd
        be misreporting; they're translation strings, so marketing can change
        them without a code change.
      */}
      <dl className="relative flex w-full max-w-[600px]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/*
              dir="ltr" because "50K+" is a Latin-digit run ending in a neutral
              character: in an RTL paragraph the bidi algorithm moves the "+" to
              the left, rendering "+50K".
            */}
            <dt className="text-aqua text-[22px] font-bold" dir="ltr">
              {stat.value}
            </dt>
            <dd className="text-ink-500 text-[12px]">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
